import type * as React from 'react';
import { View } from 'react-native';
import { AgentLoginTerminal } from '#features/agents';
import { IconButton } from '#primitives/buttons/icon-button';
import { Text } from '#primitives/display/text';
import {
  Sheet,
  type SheetDetent,
  type SheetProps,
} from '#primitives/overlays/sheet';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import type { TerminalSignInProps } from '../../types/session-callout';

// A terminal sign-in method runs the Agent's login command on the Server: a panel under the Composer on a wide window, a sheet on a phone.
export function TerminalSignIn(props: TerminalSignInProps): React.JSX.Element {
  return (
    <>
      <SizeClass only="wide">
        <TerminalPanel {...props} />
      </SizeClass>
      <SizeClass only="compact">
        <TerminalSheet {...props} />
      </SizeClass>
    </>
  );
}

const largeDetent: SheetDetent[] = ['large'];

const closedBy =
  (onClose: () => void) =>
  (open: boolean): void => {
    if (!open) onClose();
  };

const sheetProps = (
  props: TerminalSignInProps,
): Omit<SheetProps, 'children'> => ({
  open: true,
  onOpenChange: closedBy(props.onClose),
  label: props.title,
  detents: largeDetent,
});

function TerminalSheet(props: TerminalSignInProps): React.JSX.Element {
  return (
    <Sheet {...sheetProps(props)}>
      <Sheet.Page name="terminal" title={props.title}>
        <View className="px-4">
          <AgentLoginTerminal {...props.terminal} enabled />
        </View>
      </Sheet.Page>
    </Sheet>
  );
}

function TerminalPanel(props: TerminalSignInProps): React.JSX.Element {
  return (
    <View className="w-full gap-2 bg-card px-4 pt-2 pb-4">
      <TerminalPanelHeader {...props} />
      <AgentLoginTerminal {...props.terminal} enabled />
    </View>
  );
}

function TerminalPanelHeader(props: TerminalSignInProps): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <Text role="heading" accessibilityRole="heading" aria-level={2}>
        {props.title}
      </Text>
      <CloseButton onClose={props.onClose} />
    </View>
  );
}

function CloseButton({
  onClose,
}: Pick<TerminalSignInProps, 'onClose'>): React.JSX.Element {
  return (
    <IconButton
      icon="close"
      variant="ghost"
      size="sm"
      accessibilityLabel="Close"
      onPress={onClose}
    />
  );
}
