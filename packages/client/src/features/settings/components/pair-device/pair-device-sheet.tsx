import type { MintedPairingTicket, PairingRegistration } from '@repo/contracts';
import { Button, type ButtonProps } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { useCentresOverlays } from '@repo/kit/primitives/overlays/centred-overlay';
import { Sheet, type SheetProps } from '@repo/kit/primitives/overlays/sheet';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import { PairingCode } from './pairing-code';

// Where the Server's answer has got to. A sheet holds at most one live code, and never two at once.
export type PairingCodeLoad =
  | { status: 'minting' | 'expired' | 'error' }
  | ({ status: 'live' } & MintedPairingTicket);

export interface PairDeviceSheetProps {
  open: boolean;
  code: PairingCodeLoad;
  /*
   * The Device that has just registered with this sheet's code, by the name it claims for itself.
   * Pre-authentication and untrusted (ADR-0045): the owner reads it to recognise the Device, and nothing in Argo decides anything by it.
   */
  asking?: PairingRegistration;
  onOpenChange: (open: boolean) => void;
  onNewCode: () => void;
  onAllow: (asking: PairingRegistration) => void;
  onDecline: (asking: PairingRegistration) => void;
}

const title = 'Pair a Device';

const doneLabel = 'Done';

const messages = {
  minting: 'Getting a code…',
  expired:
    'This code has expired. A code lasts about two minutes, so a photograph of your screen is not a lasting key.',
  error: 'Could not get a code from the Server.',
};

/*
 * The one place a Device is paired (ADR-0045). Opening the sheet is what mints a Pairing Ticket, so the owner asking for a code is the consent, and the sheet stays where they answer for the Device that turns up.
 * Desktop only: a browser has no secure storage for a Device Key, so a web App is never a Paired Device and never draws this.
 */
export function PairDeviceSheet(
  props: PairDeviceSheetProps,
): React.JSX.Element {
  return (
    <Sheet {...sheetProps(props)}>
      <CodePage {...props} />
    </Sheet>
  );
}

const sheetProps = (
  props: PairDeviceSheetProps,
): Omit<SheetProps, 'children'> => ({
  open: props.open,
  onOpenChange: props.onOpenChange,
  label: title,
  wide: true,
  footer: <SheetActions {...props} />,
});

/*
 * The sheet's one title: the Device that turned up while the code was up, else the sheet's own name.
 * The page carries it rather than a title row of the kit's, because the design sets it on the page's
 * leading edge with Done opposite it, where the kit's row centres a title over a close button.
 */
const screenTitle = (asking: PairingRegistration | undefined): string =>
  asking ? `${asking.claimedName} wants to pair` : title;

/*
 * The sheet's one page: its title row, then the Device's claim while one is asking, else the code or why
 * there is none. It pads itself rather than taking the sheet's standard inset, because the design gives a
 * card this wide more room around its two columns than a form page needs; the footer keeps to the same edge.
 */
function CodePage(props: PairDeviceSheetProps): React.JSX.Element {
  return (
    <View className="gap-6 px-6 pt-6">
      <TitleRow {...props} />
      <PageBody {...props} />
    </View>
  );
}

/*
 * Done is the way out of a sheet the owner opened to read something. A Device that is asking takes it
 * away, because the answer is then Allow or Don't allow and a third way out would say nothing about it.
 */
function TitleRow(props: PairDeviceSheetProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-4">
      <View className="min-w-0 flex-1">
        <Text role="title" accessibilityRole="heading" numberOfLines={1}>
          {screenTitle(props.asking)}
        </Text>
      </View>
      {props.asking ? null : <DoneButton {...props} />}
    </View>
  );
}

function DoneButton(props: PairDeviceSheetProps): React.JSX.Element {
  return (
    <Button
      label={doneLabel}
      variant="secondary"
      size="sm"
      onPress={() => props.onOpenChange(false)}
    />
  );
}

function PageBody(props: PairDeviceSheetProps): React.JSX.Element {
  const { asking, code } = props;

  if (asking) return <AskingClaim asking={asking} />;

  if (code.status === 'live') return <PairingCode code={code} />;

  return <Text role="secondary">{messages[code.status]}</Text>;
}

/*
 * The claim the Device made for itself, which is all the owner has to recognise it by: the handshake has already run on a Ticket this sheet minted, so what they decide in the footer is whether that Device keeps what it got.
 * The sheet asks rather than the handshake, because this is where the owner is already present and watching the code they asked for.
 */
function AskingClaim(props: {
  asking: PairingRegistration;
}): React.JSX.Element {
  return (
    <Text role="secondary">
      {`This Device says it is ${props.asking.claimedName}. Allow it only if you recognise it.`}
    </Text>
  );
}

// Only a code that ran out or never arrived offers another: a live code and one still on its way need no answer.
const offersANewCode = (code: PairingCodeLoad): boolean =>
  code.status === 'expired' || code.status === 'error';

// The sheet's actions sit at its foot, as a request sheet's do; the page above them holds only what is read.
function SheetActions(props: PairDeviceSheetProps): React.JSX.Element | null {
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
      label="New code"
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
  { label: "Don't allow", variant: 'danger', onPress: () => onDecline(asking) },
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
