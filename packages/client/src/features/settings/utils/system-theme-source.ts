import { Platform } from 'react-native';

// What the System theme follows on this Device: the phone's OS, macOS in the desktop app, else this device's setting.
export function systemThemeSource(): string {
  return Platform.select({
    ios: 'iOS',
    android: 'Android',
    default: webThemeSource(),
  });
}

function webThemeSource(): string {
  return globalThis.window?.argo ? 'macOS' : 'this device';
}
