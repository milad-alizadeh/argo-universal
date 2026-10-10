import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import type { IconButtonProps } from '../../../lib/generic/primitives/icon-button';
import {
  Pressable,
  contentActionClass,
} from '../../../lib/generic/primitives/pressable';
import { Icon } from '../../../lib/generic/symbols/icon';

type RequestActionProps = Pick<
  IconButtonProps,
  'className' | 'disabled' | 'onPress'
> & {
  accessibilityLabel?: string;
  children: string;
  primary?: boolean;
};

function actionProps(
  { primary, children: _, className, ...props }: RequestActionProps,
  wide: boolean,
): React.ComponentProps<typeof Pressable> {
  return {
    role: 'button',
    ...props,
    className: contentActionClass({
      variant: primary ? 'default' : 'ghost',
      disabled: !!props.disabled,
      className: actionClassName({ primary, className }, wide),
    }),
  };
}

function actionClassName(
  props: Pick<RequestActionProps, 'primary' | 'className'>,
  wide: boolean,
): string {
  return cn(
    wide ? 'h-8 sm:h-8 rounded-md px-3' : 'h-11 sm:h-11 rounded-lg px-4',
    primaryInset(props.primary, wide),
    props.className,
  );
}

function primaryInset(
  primary: boolean | undefined,
  wide: boolean,
): string | undefined {
  return primary && wide ? 'pr-1.5' : undefined;
}

export function RequestAction(props: RequestActionProps): ReactNode {
  const wide = useContentWide();
  return (
    <Pressable {...actionProps(props, wide)}>
      <ActionContent {...props} wide={wide} />
    </Pressable>
  );
}

function ActionContent({
  children,
  primary,
  wide,
}: Pick<RequestActionProps, 'children' | 'primary'> & {
  wide: boolean;
}): ReactNode {
  return (
    <>
      <Text
        className={cn('type-control', primary && 'text-primary-foreground')}
      >
        {children}
      </Text>
      {primary && <ReturnKey wide={wide} />}
    </>
  );
}

function ReturnKey({ wide }: { wide: boolean }): ReactNode {
  return (
    <View
      className={cn(
        'size-5 items-center justify-center rounded-sm bg-primary-foreground/15',
        !wide && 'hidden',
      )}
    >
      <Icon name="return" size="md" className="text-primary-foreground" />
    </View>
  );
}
