import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { useServerPaired } from '#lib/product/server-place';
import { Icon } from '../../../../lib/generic/symbols/icon';

// On the Server's computer the host needs no name; only a lost Connection shows.
export function ServerLocation({
  name,
  connected,
}: {
  name: string;
  connected: boolean;
}): React.JSX.Element | false {
  const wide = useContentWide();
  const paired = useServerPaired();
  return (
    (paired || !connected) && (
      <View
        className={cn(
          'flex-row items-center gap-1.5 shrink-0',
          wide ? 'h-7 px-1.5' : 'h-10 px-4',
        )}
      >
        {paired && (
          <>
            <Icon
              role="control"
              name="computer"
              className="text-muted-foreground"
            />
            <Text numberOfLines={1} role="body">
              {name}
            </Text>
          </>
        )}
        <View
          role="img"
          accessibilityLabel={connected ? 'Connected' : 'Reconnecting'}
          className={cn(
            'size-[7px] shrink-0 rounded-full',
            connected ? 'bg-success' : 'bg-warning',
          )}
        />
        {!connected && (
          <Text role="secondary" className="pl-1 text-warning">
            Reconnecting…
          </Text>
        )}
      </View>
    )
  );
}
