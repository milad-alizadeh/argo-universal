import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import {
  Dialog,
  DialogDescriptionText,
  DialogFrame,
  DialogOverlay,
  DialogPortal,
  DialogTitleText,
} from '#primitives/overlays/dialog';
import {
  alertActionPress,
  ignoreCloseWhileBusy,
  isAlertActionEnabled,
  isCancel,
  isDestructive,
  type AlertAction,
  answeredAlert,
  type AlertProps,
  type AnsweredAlertProps,
} from './alert-props';

const contentClassName =
  'bg-card z-50 mx-auto flex w-full min-w-80 max-w-sm flex-col gap-4 rounded-2xl p-6 web:w-96 web:rounded-sheet web:shadow-card web:animate-in web:fade-in-0 web:zoom-in-95 web:max-w-full web:duration-200';

// The web draws an alert as a centred dialog at every width, never as a sheet.
export function Alert(input: AlertProps): React.JSX.Element {
  const props = answeredAlert(input);

  return (
    <Dialog open={props.open} onOpenChange={ignoreCloseWhileBusy(props)}>
      <DialogPortal>
        <DialogOverlay>
          <AlertCard {...props} />
        </DialogOverlay>
      </DialogPortal>
    </Dialog>
  );
}

function AlertCard(props: AnsweredAlertProps): React.JSX.Element {
  return (
    <DialogFrame className={contentClassName}>
      <AlertHeading title={props.title} message={props.message} />
      <AlertButtons {...props} />
    </DialogFrame>
  );
}

type AlertHeadingProps = Pick<AnsweredAlertProps, 'title' | 'message'>;

function AlertHeading(props: AlertHeadingProps): React.JSX.Element {
  return (
    <View className="gap-2">
      <DialogTitleText className="type-heading text-foreground">
        {props.title}
      </DialogTitleText>
      {props.message ? (
        <DialogDescriptionText className="type-secondary">
          {props.message}
        </DialogDescriptionText>
      ) : null}
    </View>
  );
}

function AlertButtons(
  props: Pick<AnsweredAlertProps, 'actions' | 'onOpenChange'>,
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
  return [...actions].sort((a, b) => Number(isCancel(b)) - Number(isCancel(a)));
}

type AlertButtonProps = Pick<AnsweredAlertProps, 'actions' | 'onOpenChange'> & {
  action: AlertAction;
};

// A running answer draws the Button's own spinner; every answer waits for it.
function AlertButton(props: AlertButtonProps): React.JSX.Element {
  const { action } = props;

  return (
    <Button
      label={action.label}
      variant={isCancel(action) ? 'outline' : 'default'}
      tone={isDestructive(action) ? 'danger' : undefined}
      loading={action.loading}
      disabled={!isAlertActionEnabled(action, props.actions)}
      onPress={alertActionPress(action, props.onOpenChange)}
    />
  );
}

export type { AlertAction, AlertProps } from './alert-props';

Alert satisfies React.ComponentType<AlertProps>;
