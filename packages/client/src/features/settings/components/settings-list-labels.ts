import type { SettingsListProps } from './settings-list-props';

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

/*
 * A count the Server sends: "…" until it first answers, nothing while
 * disconnected with no answer yet, else the last known count.
 */
export function countValue(
  props: SettingsListProps,
  count: number | undefined,
): string | undefined {
  if (count !== undefined) return serverValue(props, String(count));
  return props.status === 'disconnected' ? undefined : '…';
}
