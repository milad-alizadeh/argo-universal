import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { useServerPaired } from '#lib/product/server-scope';

interface ServerLocationProps {
  name: string;
  connected: boolean;
}

interface ServerLayout extends ServerLocationProps {
  wide: boolean;
  paired: boolean;
}

export function ServerLocation(
  props: ServerLocationProps,
): React.JSX.Element | false {
  const wide = useContentWide();
  const paired = useServerPaired();

  return (
    (paired || !props.connected) && (
      <ServerDetails {...props} wide={wide} paired={paired} />
    )
  );
}

function ServerDetails(props: ServerLayout): React.JSX.Element {
  return (
    <View className={serverClassName(props.wide)}>
      {props.paired && <ServerName name={props.name} />}
      <ServerConnection connected={props.connected} />
      <ServerReconnecting connected={props.connected} />
    </View>
  );
}

function ServerName({
  name,
}: Pick<ServerLocationProps, 'name'>): React.JSX.Element {
  return (
    <>
      <Icon name="computer" className="text-muted-foreground" />
      <Text numberOfLines={1} role="body">
        {name}
      </Text>
    </>
  );
}

function ServerConnection({
  connected,
}: Pick<ServerLocationProps, 'connected'>): React.JSX.Element {
  return (
    <View
      role="img"
      accessibilityLabel={connected ? 'Connected' : 'Reconnecting'}
      className={cn(
        'size-1.75 shrink-0 rounded-full',
        connected ? 'bg-success' : 'bg-warning',
      )}
    />
  );
}

function serverClassName(wide: boolean): string {
  return cn(
    'flex-row items-center gap-1.5 shrink-0',
    wide ? 'h-7 px-1.5' : 'h-10 px-4',
  );
}

function ServerReconnecting({
  connected,
}: Pick<ServerLocationProps, 'connected'>): React.JSX.Element | null {
  return connected ? null : (
    <Text role="secondary" className="pl-1 text-warning">
      Reconnecting…
    </Text>
  );
}
