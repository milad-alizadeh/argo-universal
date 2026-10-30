import type * as React from 'react';
import { View } from 'react-native';
import { Button, type ButtonProps } from '#primitives/actions/button';
import {
  CentredModal,
  CentredModalDescription,
  CentredModalTitle,
} from '#primitives/overlays/centred-overlay';
import { Dialog } from '#primitives/overlays/dialog';
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
      <AlertCard {...props} />
    </Dialog>
  );
}

function AlertCard(props: AnsweredAlertProps): React.JSX.Element {
  return (
    <CentredModal className={contentClassName}>
      <AlertHeading title={props.title} message={props.message} />
      <AlertButtons {...props} />
    </CentredModal>
  );
}

type AlertHeadingProps = Pick<AnsweredAlertProps, 'title' | 'message'>;

function AlertHeading(props: AlertHeadingProps): React.JSX.Element {
  return (
    <View className="gap-2">
      <CentredModalTitle className="type-heading text-foreground">
        {props.title}
      </CentredModalTitle>
      {props.message ? (
        <CentredModalDescription className="type-secondary">
          {props.message}
        </CentredModalDescription>
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

function alertVariant(
  action: AlertButtonProps['action'],
): ButtonProps['variant'] {
  if (isDestructive(action)) return 'danger';

  return isCancel(action) ? 'secondary' : 'primary';
}

// A running answer draws the Button's own spinner; every answer waits for it.
function AlertButton(props: AlertButtonProps): React.JSX.Element {
  const { action } = props;

  return (
    <Button
      label={action.label}
      variant={alertVariant(action)}
      disabled={!isAlertActionEnabled(action, props.actions) || action.loading}
      onPress={alertActionPress(action, props.onOpenChange)}
    />
  );
}

export type { AlertProps } from './alert-props';

Alert satisfies React.ComponentType<AlertProps>;
