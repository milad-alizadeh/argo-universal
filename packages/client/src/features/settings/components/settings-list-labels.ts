import { Platform } from 'react-native';
import type { SettingsListProps } from './settings-list-props';

export function deviceName(wide: boolean): string {
  if (wide) return 'This Mac';
  return Platform.OS === 'android' ? 'This phone' : 'This iPhone';
}

export function serverFooter(
  status: SettingsListProps['status'],
): string | undefined {
  if (status === 'loading') return 'Loading Server settings…';
  if (status === 'disconnected')
    return 'Server unavailable. Open Connection to reconnect.';
  return undefined;
}

export function connectionValue(
  props: SettingsListProps,
  wide: boolean,
): string {
  if (props.status === 'loading') return 'Connecting…';
  if (props.status === 'disconnected') return 'Disconnected';
  return props.connectionState ?? (wide ? 'This Mac' : 'Direct');
}

export function serverValue(
  props: SettingsListProps,
  value?: string,
): string | undefined {
  return props.status === 'loading' ? '…' : value;
}
