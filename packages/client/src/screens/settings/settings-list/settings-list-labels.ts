import type { SettingsListViewProps } from './settings-list-props';

type ServerStatus = NonNullable<SettingsListViewProps['status']>;

const connectionValues: Record<
  ServerStatus,
  (props: SettingsListViewProps, wide: boolean) => string
> = {
  loading: () => 'Connecting…',
  disconnected: () => 'Disconnected',
  ready: (props, wide) =>
    props.connectionState ?? (wide ? 'This Mac' : 'Direct'),
};

export function connectionValue(
  props: SettingsListViewProps,
  wide: boolean,
): string {
  return connectionValues[props.status ?? 'ready'](props, wide);
}

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
