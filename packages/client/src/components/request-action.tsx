import { KeyReturnIcon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Button, type ButtonProps } from '#primitives/button';
import { Text } from '#primitives/text';
import { useContentWide } from './content-layout';
import { Icon } from './icon';

type RequestActionProps = Omit<ButtonProps, 'children'> & {
  children: string;
  primary?: boolean;
};

function actionProps(
  { primary, children: _, className, ...props }: RequestActionProps,
  wide: boolean,
): ButtonProps {
  return {
    variant: primary ? 'default' : 'ghost',
    ...props,
    className: actionClassName({ primary, className }, wide),
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
    <Button {...actionProps(props, wide)}>
      <ActionContent {...props} wide={wide} />
    </Button>
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
      <Text className="text-sm leading-5 font-medium">{children}</Text>
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
      <Icon as={KeyReturnIcon} size="md" className="text-primary-foreground" />
    </View>
  );
}
