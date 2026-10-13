import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Button } from '../../buttons/button/button';
import { DialogOverlay } from '../dialog/dialog-overlay';
import {
  alertActionPress,
  type AlertAction,
  type AlertProps,
} from './alert-props';

const contentClassName = cn(
  'bg-popover z-50 mx-auto flex w-full min-w-80 max-w-sm flex-col gap-4 rounded-2xl p-6',
  Platform.select({
    web: 'w-96 rounded-surface shadow-card animate-in fade-in-0 zoom-in-95 web:max-w-[calc(100%-2rem)] duration-200',
  }),
);

// The web draws an alert as a centred dialog at every width, never as a sheet.
export function Alert(props: AlertProps): React.JSX.Element {
  return (
    <DialogPrimitive.Root open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogOverlay>
          <DialogPrimitive.Content className={contentClassName}>
            <AlertHeading title={props.title} message={props.message} />
            <AlertButtons {...props} />
          </DialogPrimitive.Content>
        </DialogOverlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type AlertHeadingProps = Pick<AlertProps, 'title' | 'message'>;

function AlertHeading(props: AlertHeadingProps): React.JSX.Element {
  return (
    <View className="gap-2">
      <DialogPrimitive.Title className="type-heading text-foreground">
        {props.title}
      </DialogPrimitive.Title>
      {props.message ? (
        <DialogPrimitive.Description className="type-secondary">
          {props.message}
        </DialogPrimitive.Description>
      ) : null}
    </View>
  );
}

function AlertButtons(
  props: Pick<AlertProps, 'actions' | 'onOpenChange'>,
): React.JSX.Element {
  return (
    <View className="flex-row justify-end gap-2">
      {cancelFirst(props.actions).map((action) => (
        <AlertButton key={action.label} action={action} {...props} />
      ))}
    </View>
  );
}

// The web reads left to right, so Cancel comes first and the answer sits at the trailing edge.
function cancelFirst(actions: readonly AlertAction[]): AlertAction[] {
  return [...actions].sort(
    (a, b) => Number(b.role === 'cancel') - Number(a.role === 'cancel'),
  );
}

function AlertButton(
  props: Pick<AlertProps, 'onOpenChange'> & { action: AlertAction },
): React.JSX.Element {
  const { action } = props;
  return (
    <Button
      label={action.label}
      variant={action.role === 'cancel' ? 'outline' : 'default'}
      role={action.role === 'destructive' ? 'destructive' : undefined}
      onPress={alertActionPress(action, props.onOpenChange)}
    />
  );
}

export type { AlertAction, AlertProps } from './alert-props';
