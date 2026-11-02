import type { SettingsListViewProps } from './settings-list-props';

type ServerStatus = NonNullable<SettingsListViewProps['status']>;

/*
 * An open Connection has nothing to add: its badge says available, and the Servers row above it already names the
 * Server being shown. No value says "Mac" either: the Server Device may be Windows or Linux (ADR-0045).
 */
const connectionValues: Record<ServerStatus, string | undefined> = {
  loading: 'Connecting…',
  disconnected: 'Disconnected',
  ready: undefined,
};

export const connectionValue = (
  props: SettingsListViewProps,
): string | undefined => connectionValues[props.status ?? 'ready'];

export function serverValue(
  props: SettingsListViewProps,
  value?: string,
): string | undefined {
  return props.status === 'loading' ? '…' : value;
}

/*
 * A count the Server sends: "…" until it first answers, nothing while
 * disconnected with no answer yet, else the last known count.
 */
export function countValue(
  props: SettingsListViewProps,
  count: number | undefined,
): string | undefined {
  if (count !== undefined) return serverValue(props, String(count));

  return props.status === 'disconnected' ? undefined : '…';
}
