import type { SettingsPagesProps } from './settings-pages-props';

type ServerStatus = NonNullable<SettingsPagesProps['status']>;

const connectionValues: Record<
  ServerStatus,
  (props: SettingsPagesProps, wide: boolean) => string
> = {
  loading: () => 'Connecting…',
  disconnected: () => 'Disconnected',
  ready: (props, wide) =>
    props.connectionState ?? (wide ? 'This Mac' : 'Direct'),
};

export function connectionValue(
  props: SettingsPagesProps,
  wide: boolean,
): string {
  return connectionValues[props.status ?? 'ready'](props, wide);
}

export function serverValue(
  props: SettingsPagesProps,
  value?: string,
): string | undefined {
  return props.status === 'loading' ? '…' : value;
}

/*
 * A count the Server sends: "…" until it first answers, nothing while
 * disconnected with no answer yet, else the last known count.
 */
export function countValue(
  props: SettingsPagesProps,
  count: number | undefined,
): string | undefined {
  if (count !== undefined) return serverValue(props, String(count));

  return props.status === 'disconnected' ? undefined : '…';
}
