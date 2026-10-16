import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/buttons/button';
import { DialogOverlay } from '#primitives/overlays/dialog';
import {
  alertActionPress,
  ignoreCloseWhileBusy,
  isAlertActionEnabled,
  type AlertAction,
  type AlertProps,
} from './alert-props';

const contentClassName =
  'bg-card z-50 mx-auto flex w-full min-w-80 max-w-sm flex-col gap-4 rounded-2xl p-6 web:w-96 web:rounded-sheet web:shadow-card web:animate-in web:fade-in-0 web:zoom-in-95 web:max-w-full web:duration-200';

// The web draws an alert as a centred dialog at every width, never as a sheet.
export function Alert(props: AlertProps): React.JSX.Element {
  return (
    <DialogPrimitive.Root
      open={props.open}
      onOpenChange={ignoreCloseWhileBusy(props)}
    >
      <DialogPrimitive.Portal>
        <DialogOverlay>
          <AlertCard {...props} />
        </DialogOverlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function AlertCard(props: AlertProps): React.JSX.Element {
  return (
    <DialogPrimitive.Content className={contentClassName}>
      <AlertHeading title={props.title} message={props.message} />
      <AlertButtons {...props} />
    </DialogPrimitive.Content>
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
  return [...actions].sort((a, b) => Number(!!b.cancel) - Number(!!a.cancel));
}

type AlertButtonProps = Pick<AlertProps, 'actions' | 'onOpenChange'> & {
  action: AlertAction;
};

// A running answer draws the Button's own spinner; every answer waits for it.
function AlertButton(props: AlertButtonProps): React.JSX.Element {
  const { action } = props;

  return (
    <Button
      label={action.label}
      variant={action.cancel ? 'outline' : 'default'}
      tone={action.tone}
      loading={action.loading}
      disabled={!isAlertActionEnabled(action, props.actions)}
      onPress={alertActionPress(action, props.onOpenChange)}
    />
  );
}

export type { AlertAction, AlertProps } from './alert-props';

Alert satisfies React.ComponentType<AlertProps>;
