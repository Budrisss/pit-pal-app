import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fdc2b7835bb9413f8a022185add13ee4',
  appName: 'pit-pal-app',
  webDir: 'dist',
  server: {
    url: 'https://fdc2b783-5bb9-413f-8a02-2185add13ee4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Scanning for radios…',
        cancel: 'Cancel',
        availableDevices: 'Nearby radios',
        noDeviceFound: 'No Meshtastic radios found nearby',
      },
    },
  },
  ios: {
    // Background BLE so paired radio stays connected briefly when app backgrounds.
    // Add NSBluetoothAlwaysUsageDescription + UIBackgroundModes=bluetooth-central
    // to Info.plist after `npx cap add ios` (handled by user's native project).
  },
};

export default config;
