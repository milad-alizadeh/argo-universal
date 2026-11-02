import type { PairingRegistration } from '@repo/contracts';
import { Button, type ButtonProps } from '@repo/kit/primitives/actions/button';
import { useCentresOverlays } from '@repo/kit/primitives/overlays/centred-overlay';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import type {
  PairDeviceSheetProps,
  PairingCodeLoad,
} from './pair-device-sheet';

// Only a code that ran out or never arrived offers another: a live code and one still on its way need no answer.
const offersANewCode = (code: PairingCodeLoad): boolean =>
  code.status === 'expired' || code.status === 'error';

// The sheet's actions sit at its foot, as a request sheet's do; the page above them holds only what is read.
export function SheetActions(
  props: PairDeviceSheetProps,
): React.JSX.Element | null {
  const { asking, code } = props;

  if (asking) return <AskingAnswers {...props} asking={asking} />;

  if (!offersANewCode(code)) return null;

  return (
    <SheetFooter>
      <NewCodeButton onNewCode={props.onNewCode} />
    </SheetFooter>
  );
}

// A sheet raised from the bottom edge stacks its actions full width; a centred one lines them up at its trailing edge, as a dialog's footer does.
function SheetFooter(props: { children: React.ReactNode }): React.JSX.Element {
  const centred = useCentresOverlays();

  return (
    <View
      className={cn(
        'gap-2 px-6 pt-4 pb-2',
        centred ? 'flex-row justify-end' : 'flex-col-reverse',
      )}
    >
      {props.children}
    </View>
  );
}

// Whether an action fills the width is the footer's own question, so every button in it asks the same way.
const useActionWidth = (): boolean => !useCentresOverlays();

function NewCodeButton(props: { onNewCode: () => void }): React.JSX.Element {
  return (
    <Button
      label="Show a new code"
      variant="primary"
      fullWidth={useActionWidth()}
      onPress={props.onNewCode}
    />
  );
}

type Answers = {
  asking: PairingRegistration;
  onAllow: PairDeviceSheetProps['onAllow'];
  onDecline: PairDeviceSheetProps['onDecline'];
};

// Don't allow leads Allow where they sit in a row, and sits under it where they stack, so the answer that grants nothing is never the harder one to reach.
const answersFor = ({ asking, onAllow, onDecline }: Answers): ButtonProps[] => [
  {
    label: "Don't allow",
    variant: 'secondary',
    onPress: () => onDecline(asking),
  },
  { label: 'Allow', variant: 'primary', onPress: () => onAllow(asking) },
];

function AskingAnswers(props: Answers): React.JSX.Element {
  const fullWidth = useActionWidth();

  return (
    <SheetFooter>
      {answersFor(props).map((answer) => (
        <Button key={answer.label} {...answer} fullWidth={fullWidth} />
      ))}
    </SheetFooter>
  );
}
