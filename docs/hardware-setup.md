# Hardware Setup — LoRa Fallback for Trackside Ops

Real-world deploy guide for the LoRa cell-loss fallback. Audience: race-control
ops or a tech-comfortable organizer setting up a track for the first time.

## What you need

Per event:

- **1× RAK7289v2 WisGate Edge Pro** (the gateway, mounted high at race control)
- **1× external 8 dBi fiberglass antenna** for the gateway (902-928 MHz US915)
- **N× Seeed T1000-E Meshtastic trackers** (one per active racer/crew member, ~40-50 for a typical run group)
- **1× spare T1000-E** flashed in MQTT-bridge mode, plugged into the RAK via USB

## One-time gateway setup (~30 min)

### 1. Mount and power the RAK

- Mount as high as possible at race control with line-of-sight to the track surface (8-12 ft pole minimum on flat tracks; higher on hilly courses).
- Connect the 8 dBi antenna with a low-loss LMR-400 cable. Keep the cable run under 10 ft if possible.
- Power via PoE injector (included) or 12V DC. Connect ethernet to the venue's internet uplink (or pop in an LTE SIM if the RAK has the cellular variant).

### 2. Install Mosquitto on the gateway

SSH into the RAK (default IP `192.168.230.1`, user `root`, password `root` — change on first login):

```bash
opkg update
opkg install mosquitto mosquitto-client
/etc/init.d/mosquitto enable
/etc/init.d/mosquitto start
```

Verify it's listening on port 1883:

```bash
netstat -lnp | grep 1883
```

### 3. Install the MQTT → HTTPS bridge script

Drop the following file at `/usr/bin/meshtastic-bridge.py` on the RAK:

```python
#!/usr/bin/env python3
"""Subscribes to Meshtastic MQTT topics and POSTs each packet to the
   meshtastic-uplink edge function with HMAC-SHA256 signing."""
import hashlib, hmac, json, os, time, urllib.request
import paho.mqtt.client as mqtt

ENDPOINT = os.environ["UPLINK_URL"]      # https://<project-ref>.supabase.co/functions/v1/meshtastic-uplink
SECRET   = os.environ["HMAC_SECRET"]     # matches lora_event_channels.hmac_secret
CHANNEL  = os.environ["CHANNEL_NAME"]    # matches lora_event_channels.channel_name

def post(payload_bytes: bytes):
    sig = hmac.new(SECRET.encode(), payload_bytes, hashlib.sha256).hexdigest()
    req = urllib.request.Request(
        ENDPOINT, data=payload_bytes,
        headers={"Content-Type": "application/json", "X-Signature": sig, "X-Channel": CHANNEL},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=5).read()
    except Exception as e:
        print(f"[bridge] POST failed: {e}")

def on_message(_c, _u, msg):
    try:
        data = json.loads(msg.payload)
        body = json.dumps({
            "channel": CHANNEL,
            "from": data.get("from"),
            "rssi": data.get("rssi"),
            "snr":  data.get("snr"),
            "received_at": int(time.time() * 1000),
            "text": data.get("payload", {}).get("text"),
        }).encode()
        post(body)
    except Exception as e:
        print(f"[bridge] decode failed: {e}")

c = mqtt.Client()
c.connect("127.0.0.1", 1883, 60)
c.subscribe("msh/+/2/json/#")
c.on_message = on_message
c.loop_forever()
```

Make it run on boot via a systemd-like init script:

```bash
chmod +x /usr/bin/meshtastic-bridge.py
cat > /etc/init.d/meshtastic-bridge <<'EOF'
#!/bin/sh /etc/rc.common
START=99
start() {
  export UPLINK_URL="https://<your-project-ref>.supabase.co/functions/v1/meshtastic-uplink"
  export HMAC_SECRET="<paste from organizer settings>"
  export CHANNEL_NAME="<event-channel-name>"
  /usr/bin/meshtastic-bridge.py &
}
EOF
chmod +x /etc/init.d/meshtastic-bridge
/etc/init.d/meshtastic-bridge enable
/etc/init.d/meshtastic-bridge start
```

### 4. Plug the bridge T1000-E into the RAK

This is the node that actually receives mesh packets and republishes them to local MQTT. Flash it via the Meshtastic web flasher (https://flasher.meshtastic.org), then in Meshtastic config:

- **Region**: US
- **Role**: ROUTER (so it stays on-air listening)
- **MQTT**: enabled, server `localhost`, port `1883`, JSON output ON
- **Channel**: same name + PSK as the rest of your fleet

USB-connect it to the RAK. Done.

## Per-event setup (~5 min in the app)

1. Organizer opens the event, generates a Meshtastic channel: pick a short slug (e.g. `vir-may-25`) and let the app generate the PSK.
2. Print/share the channel QR code — racers scan it into their personal T1000-E via the Meshtastic mobile app on first pairing.
3. App stores the mapping (channel → event_id, with HMAC secret) in the `lora_event_channels` table.
4. The HMAC secret + channel name get pasted into the RAK's `/etc/init.d/meshtastic-bridge` env block (one-time per event, or rotate per-day for security).

## Per-racer setup (~2 min, one-time)

1. Racer charges their T1000-E, flashes Meshtastic firmware (web flasher).
2. Sets region to US, joins the event channel via QR scan.
3. Opens Trackside Ops app → Settings → **LoRa Radio** → **Pair Radio** → picks their node.
4. Toggles **Enable LoRa fallback** ON.
5. Clips the node to belt/dash/helmet bag.

When cell drops mid-session, the app silently fails over to the radio. The `LoRa` badge in race control shows who's on which transport in real time.

## Antenna placement quick reference

| Track style | Recommended height | Notes |
|---|---|---|
| Flat road course (Sebring) | 8-12 ft pole at race control | 1 gateway covers full circuit |
| Hilly road course (VIR) | 15-25 ft pole, hilltop preferred | Add a relay T1000-E (Router role) at the back straight |
| Multi-use facility (NJMP) | 12 ft at central hub | Run a separate channel per circuit, separate gateway each |
| Karting / autocross | 6-8 ft tripod, line-of-sight to grid | One gateway easy |

## On-track verification checklist

Before greens fly, walk the perimeter with a paired phone in airplane mode:

- [ ] Flag broadcast from race control reaches every corner within 3s
- [ ] Test packet from far-side paddock arrives at race control screen
- [ ] RAK web UI shows >0 received packets in last 60s
- [ ] No T1000-E shows battery <30%

## Honest gotchas

- iOS BLE will disconnect ~30s after backgrounding. Racers must keep the app foregrounded on track.
- Each user pairs to *their own* node. BLE range is ~10m — you cannot share one node between racers.
- Meshtastic mesh latency: 1-3s per hop, typically 1-2 hops at a track. Fine for flags, marginal for tight gap data.
- The bridge script runs as root in the example above; tighten permissions for production.
- The HMAC secret rotation is manual today — automate it if you run frequent events.
