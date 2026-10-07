import { InfoIcon, KeyReturnIcon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#lib/utils';
import { Button, type ButtonProps } from '#primitives/button';
import { Text } from '#primitives/text';
import { useContentWide } from './ContentLayout';
import { Icon } from './Icon';

export function RequestCard({
  children,
  nativeID,
}: {
  children: ReactNode;
  nativeID?: ViewProps['nativeID'];
}) {
  return (
    <View
      nativeID={nativeID}
      className="w-full max-w-composer rounded-xl border border-input/80 bg-background/80 shadow-composer web:backdrop-blur-composer web:backdrop-saturate-110"
    >
      {children}
    </View>
  );
}

export function RequestAction({
  children,
  primary = false,
  ...props
}: Omit<ButtonProps, 'children'> & { children: string; primary?: boolean }) {
  const wide = useContentWide();
  return (
    <Button
      variant={primary ? 'default' : 'ghost'}
      {...props}
      className={cn(
        wide ? 'h-8 sm:h-8 rounded-md px-3' : 'h-11 sm:h-11 rounded-lg px-4',
        primary && wide && 'pr-1.5',
        props.className,
      )}
    >
      <Text className="text-sm leading-5 font-medium">{children}</Text>
      {primary && (
        <View
          className={cn(
            'size-5 items-center justify-center rounded-sm bg-primary-foreground/15',
            !wide && 'hidden',
          )}
        >
          <Icon
            as={KeyReturnIcon}
            size="md"
            className="text-primary-foreground"
          />
        </View>
      )}
    </Button>
  );
}

export function AlreadyAnswered({ reason }: { reason: string }) {
  return (
    <View
      role="status"
      className="min-h-8 min-w-0 flex-1 flex-row items-center gap-1.5 px-2"
    >
      <Icon
        as={InfoIcon}
        size="md"
        className="shrink-0 text-muted-foreground"
      />
      <Text className="min-w-0 flex-1 text-sm leading-5">{reason}</Text>
    </View>
  );
}
