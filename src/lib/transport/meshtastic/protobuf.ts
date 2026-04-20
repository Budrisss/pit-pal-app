/**
 * Hand-rolled minimal Meshtastic protobuf encoder/decoder.
 *
 * We only need two messages:
 * - ToRadio { packet: MeshPacket }       → write to TORADIO characteristic
 * - FromRadio { packet: MeshPacket }     ← notify from FROMRADIO characteristic
 *
 * Each MeshPacket carries a Data { portnum, payload } with portnum=TEXT_MESSAGE_APP (1).
 * The "payload" bytes are our existing JSON-encoded LoRaPayload (from encoder.ts).
 *
 * This avoids pulling 200KB+ of full Meshtastic protobufs for what amounts to
 * 5 wire fields. If Meshtastic schema evolves we revisit, but TEXT_MESSAGE_APP
 * has been stable since v1.x.
 *
 * Wire format reference: https://github.com/meshtastic/protobufs
 */

// Wire types
const VARINT = 0;
const LEN = 2;

// ---------- Low-level varint + length-delimited helpers ----------

function writeVarint(out: number[], value: number) {
  // JS bitwise ops are 32-bit, fine for our small values (portnums, ids)
  let v = value >>> 0;
  while (v > 0x7f) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v & 0x7f);
}

function writeTag(out: number[], fieldNumber: number, wireType: number) {
  writeVarint(out, (fieldNumber << 3) | wireType);
}

function writeBytes(out: number[], fieldNumber: number, bytes: Uint8Array) {
  writeTag(out, fieldNumber, LEN);
  writeVarint(out, bytes.length);
  for (let i = 0; i < bytes.length; i++) out.push(bytes[i]);
}

function writeUint32(out: number[], fieldNumber: number, value: number) {
  writeTag(out, fieldNumber, VARINT);
  writeVarint(out, value);
}

function readVarint(buf: Uint8Array, pos: number): { value: number; pos: number } {
  let result = 0;
  let shift = 0;
  let p = pos;
  while (p < buf.length) {
    const b = buf[p++];
    result |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return { value: result >>> 0, pos: p };
    shift += 7;
    if (shift > 35) throw new Error("Varint too long");
  }
  throw new Error("Truncated varint");
}

// ---------- High-level encode ----------

export const PORTNUM_TEXT_MESSAGE_APP = 1;
export const BROADCAST_NUM = 0xffffffff;

export interface MeshPacketInput {
  /** Source node id (uint32). Use 0 to let the radio fill in its own id. */
  from?: number;
  /** Destination node id. Default: broadcast. */
  to?: number;
  /** Application payload bytes (we put JSON-encoded LoRaPayload here). */
  payload: Uint8Array;
  /** Channel index (0 = primary). */
  channel?: number;
  /** Hop limit. Default 3. */
  hopLimit?: number;
  /** Want acknowledgement. Default false. */
  wantAck?: boolean;
}

/** Encode a Meshtastic Data submessage: { portnum=1, payload=<bytes> } */
function encodeData(payload: Uint8Array): Uint8Array {
  const out: number[] = [];
  writeUint32(out, 1, PORTNUM_TEXT_MESSAGE_APP); // portnum
  writeBytes(out, 2, payload); // payload
  return new Uint8Array(out);
}

/** Encode MeshPacket with a Data decoded payload. */
function encodeMeshPacket(input: MeshPacketInput): Uint8Array {
  const data = encodeData(input.payload);
  const out: number[] = [];
  if (input.from !== undefined && input.from !== 0) writeUint32(out, 1, input.from); // from
  writeUint32(out, 2, input.to ?? BROADCAST_NUM); // to
  if (input.channel !== undefined) writeUint32(out, 3, input.channel); // channel
  writeBytes(out, 4, data); // decoded (Data)
  if (input.hopLimit !== undefined) writeUint32(out, 7, input.hopLimit); // hop_limit (was 7 in older schemas)
  if (input.wantAck) writeUint32(out, 8, 1); // want_ack
  return new Uint8Array(out);
}

/** Encode a ToRadio message wrapping a MeshPacket. ToRadio.packet = field 1. */
export function encodeToRadioPacket(input: MeshPacketInput): Uint8Array {
  const pkt = encodeMeshPacket(input);
  const out: number[] = [];
  writeBytes(out, 1, pkt); // ToRadio.packet
  return new Uint8Array(out);
}

// ---------- High-level decode ----------

export interface DecodedMeshPacket {
  from: number;
  to: number;
  channel: number;
  portnum: number;
  payload: Uint8Array;
  rssi?: number;
  snr?: number;
}

/**
 * Best-effort decode of FromRadio bytes. We only return a packet when there's
 * a MeshPacket → Data with portnum we recognize. Other FromRadio variants
 * (config, my_node_info, etc.) return null.
 */
export function decodeFromRadioPacket(buf: Uint8Array): DecodedMeshPacket | null {
  let pos = 0;
  while (pos < buf.length) {
    const { value: tag, pos: p1 } = readVarint(buf, pos);
    pos = p1;
    const fieldNumber = tag >>> 3;
    const wireType = tag & 0x7;

    if (fieldNumber === 1 /* packet */ && wireType === LEN) {
      const { value: len, pos: p2 } = readVarint(buf, pos);
      pos = p2;
      const packetBytes = buf.subarray(pos, pos + len);
      pos += len;
      return decodeMeshPacket(packetBytes);
    }

    // Skip other fields
    pos = skipField(buf, pos, wireType);
  }
  return null;
}

function decodeMeshPacket(buf: Uint8Array): DecodedMeshPacket | null {
  let pos = 0;
  let from = 0;
  let to = BROADCAST_NUM;
  let channel = 0;
  let rssi: number | undefined;
  let snr: number | undefined;
  let dataBytes: Uint8Array | null = null;

  while (pos < buf.length) {
    const { value: tag, pos: p1 } = readVarint(buf, pos);
    pos = p1;
    const fieldNumber = tag >>> 3;
    const wireType = tag & 0x7;

    if (fieldNumber === 1 && wireType === VARINT) {
      const r = readVarint(buf, pos); from = r.value; pos = r.pos;
    } else if (fieldNumber === 2 && wireType === VARINT) {
      const r = readVarint(buf, pos); to = r.value; pos = r.pos;
    } else if (fieldNumber === 3 && wireType === VARINT) {
      const r = readVarint(buf, pos); channel = r.value; pos = r.pos;
    } else if (fieldNumber === 4 && wireType === LEN) {
      const r = readVarint(buf, pos); pos = r.pos;
      dataBytes = buf.subarray(pos, pos + r.value);
      pos += r.value;
    } else if (fieldNumber === 9 && wireType === VARINT) {
      const r = readVarint(buf, pos); rssi = r.value | 0; pos = r.pos;
    } else if (fieldNumber === 10 && wireType === VARINT) {
      const r = readVarint(buf, pos); snr = r.value | 0; pos = r.pos;
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }

  if (!dataBytes) return null;
  const data = decodeData(dataBytes);
  if (!data) return null;
  return { from, to, channel, portnum: data.portnum, payload: data.payload, rssi, snr };
}

function decodeData(buf: Uint8Array): { portnum: number; payload: Uint8Array } | null {
  let pos = 0;
  let portnum = 0;
  let payload: Uint8Array | null = null;
  while (pos < buf.length) {
    const { value: tag, pos: p1 } = readVarint(buf, pos);
    pos = p1;
    const fieldNumber = tag >>> 3;
    const wireType = tag & 0x7;
    if (fieldNumber === 1 && wireType === VARINT) {
      const r = readVarint(buf, pos); portnum = r.value; pos = r.pos;
    } else if (fieldNumber === 2 && wireType === LEN) {
      const r = readVarint(buf, pos); pos = r.pos;
      payload = buf.subarray(pos, pos + r.value);
      pos += r.value;
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }
  if (!payload) return null;
  return { portnum, payload };
}

// ---------- MyNodeInfo decode ----------
//
// FromRadio.my_info is field 3 in the FromRadio union and contains a MyNodeInfo
// message. The only field we care about is `my_node_num` (field 1, varint) — the
// 32-bit node id that becomes the `!hex` identifier the gateway/MQTT bridge sees.

export interface MyNodeInfo {
  myNodeNum: number;
  /** Convenience hex form, e.g. "!a3b1c9d8" */
  nodeIdHex: string;
}

/** Decode MyNodeInfo if this FromRadio buffer contains a my_info message. */
export function decodeMyNodeInfo(buf: Uint8Array): MyNodeInfo | null {
  let pos = 0;
  while (pos < buf.length) {
    const { value: tag, pos: p1 } = readVarint(buf, pos);
    pos = p1;
    const fieldNumber = tag >>> 3;
    const wireType = tag & 0x7;

    if (fieldNumber === 3 /* my_info */ && wireType === LEN) {
      const { value: len, pos: p2 } = readVarint(buf, pos);
      pos = p2;
      const inner = buf.subarray(pos, pos + len);
      pos += len;
      // Inside MyNodeInfo, field 1 is my_node_num (varint)
      let inPos = 0;
      while (inPos < inner.length) {
        const { value: itag, pos: ip1 } = readVarint(inner, inPos);
        inPos = ip1;
        const ifield = itag >>> 3;
        const iwire = itag & 0x7;
        if (ifield === 1 && iwire === VARINT) {
          const r = readVarint(inner, inPos);
          const num = r.value >>> 0;
          const hex = num.toString(16).padStart(8, "0");
          return { myNodeNum: num, nodeIdHex: `!${hex}` };
        }
        inPos = skipField(inner, inPos, iwire);
      }
      return null;
    }
    pos = skipField(buf, pos, wireType);
  }
  return null;
}

// ---------- Position decode ----------
//
// POSITION_APP = portnum 3. Inside the Data.payload is a Position message:
//   field 1: latitude_i  (sfixed32, 1e-7 deg)   [wire type 5]
//   field 2: longitude_i (sfixed32, 1e-7 deg)   [wire type 5]
//   field 3: altitude    (int32 meters)          [varint]
//   field 4: time        (fixed32 unix seconds)  [wire type 5]
//   field 8: ground_speed (uint32, m/s)          [varint]
//   field 9: ground_track (uint32, deg * 1e-5 in some FW; int deg in others) [varint]
//
// We're permissive — fields are optional and we just take what we get.

export const PORTNUM_POSITION_APP = 3;

export interface DecodedPosition {
  latitude: number;     // degrees
  longitude: number;    // degrees
  altitudeM?: number;   // meters
  fixTime?: Date;       // GPS fix time
  speedMps?: number;    // m/s
  headingDeg?: number;  // 0..360
}

function readSFixed32(buf: Uint8Array, pos: number): { value: number; pos: number } {
  if (pos + 4 > buf.length) throw new Error("Truncated sfixed32");
  const dv = new DataView(buf.buffer, buf.byteOffset + pos, 4);
  return { value: dv.getInt32(0, true), pos: pos + 4 };
}

function readFixed32(buf: Uint8Array, pos: number): { value: number; pos: number } {
  if (pos + 4 > buf.length) throw new Error("Truncated fixed32");
  const dv = new DataView(buf.buffer, buf.byteOffset + pos, 4);
  return { value: dv.getUint32(0, true), pos: pos + 4 };
}

/** Decode a Position payload (the inner Data.payload bytes when portnum=POSITION_APP). */
export function decodePositionPayload(buf: Uint8Array): DecodedPosition | null {
  let pos = 0;
  let latI: number | undefined;
  let lonI: number | undefined;
  let alt: number | undefined;
  let timeSec: number | undefined;
  let speed: number | undefined;
  let heading: number | undefined;

  while (pos < buf.length) {
    const { value: tag, pos: p1 } = readVarint(buf, pos);
    pos = p1;
    const fieldNumber = tag >>> 3;
    const wireType = tag & 0x7;

    try {
      if (fieldNumber === 1 && wireType === 5) {
        const r = readSFixed32(buf, pos); latI = r.value; pos = r.pos;
      } else if (fieldNumber === 2 && wireType === 5) {
        const r = readSFixed32(buf, pos); lonI = r.value; pos = r.pos;
      } else if (fieldNumber === 3 && wireType === VARINT) {
        const r = readVarint(buf, pos); alt = r.value | 0; pos = r.pos;
      } else if (fieldNumber === 4 && wireType === 5) {
        const r = readFixed32(buf, pos); timeSec = r.value; pos = r.pos;
      } else if (fieldNumber === 8 && wireType === VARINT) {
        const r = readVarint(buf, pos); speed = r.value; pos = r.pos;
      } else if (fieldNumber === 9 && wireType === VARINT) {
        const r = readVarint(buf, pos); heading = r.value; pos = r.pos;
      } else {
        pos = skipField(buf, pos, wireType);
      }
    } catch {
      return null;
    }
  }

  if (latI === undefined || lonI === undefined) return null;
  return {
    latitude: latI * 1e-7,
    longitude: lonI * 1e-7,
    altitudeM: alt,
    fixTime: timeSec ? new Date(timeSec * 1000) : undefined,
    speedMps: speed,
    headingDeg: heading,
  };
}

/**
 * Convenience: given a decoded MeshPacket, return a Position if the portnum matches.
 */
export function decodePositionFromPacket(packet: { portnum: number; payload: Uint8Array }): DecodedPosition | null {
  if (packet.portnum !== PORTNUM_POSITION_APP) return null;
  return decodePositionPayload(packet.payload);
}

function skipField(buf: Uint8Array, pos: number, wireType: number): number {
  if (wireType === VARINT) {
    return readVarint(buf, pos).pos;
  } else if (wireType === LEN) {
    const r = readVarint(buf, pos);
    return r.pos + r.value;
  } else if (wireType === 1) {
    return pos + 8; // 64-bit
  } else if (wireType === 5) {
    return pos + 4; // 32-bit
  }
  throw new Error(`Unsupported wire type ${wireType}`);
}
