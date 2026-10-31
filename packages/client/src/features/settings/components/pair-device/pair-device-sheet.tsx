import {
  pairingTicketDigits,
  type MintedPairingTicket,
  type PairingRegistration,
} from '@repo/contracts';
import { Button, type ButtonProps } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import { useCentresOverlays } from '@repo/kit/primitives/overlays/centred-overlay';
import { Sheet, type SheetProps } from '@repo/kit/primitives/overlays/sheet';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import { PairingQrCode } from './pairing-qr-code';

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

const codeSize = 220;

const messages = {
  minting: 'Getting a code…',
  expired:
    'This code has expired. A code lasts about two minutes, so a photograph of your screen is not a lasting key.',
  error: 'Could not get a code from the Server.',
};

const scanInstruction =
  'Open Argo on the other Device and scan this code, or type the digits into it.';

/*
 * The one place a Device is paired (ADR-0045). Opening the sheet is what mints a Pairing Ticket, so the owner asking for a code is the consent, and the sheet stays where they answer for the Device that turns up.
 * Desktop only: a browser has no secure storage for a Device Key, so a web App is never a Paired Device and never draws this.
 */
export function PairDeviceSheet(
  props: PairDeviceSheetProps,
): React.JSX.Element {
  return (
    <Sheet {...sheetProps(props)}>
      <Sheet.Screen name="pair" title={screenTitle(props.asking)}>
        <CodePage {...props} />
      </Sheet.Screen>
    </Sheet>
  );
}

/*
 * The sheet's one title, drawn by its title row: the Device that turned up while the code was up, else the sheet's own name.
 * The page draws no heading of its own under it, so nothing competes with the title row for the top of the sheet.
 */
const screenTitle = (asking: PairingRegistration | undefined): string =>
  asking ? `${asking.claimedName} wants to pair` : title;

const sheetProps = (
  props: PairDeviceSheetProps,
): Omit<SheetProps, 'children'> => ({
  open: props.open,
  onOpenChange: props.onOpenChange,
  label: title,
  inset: true,
  footer: <SheetActions {...props} />,
});

// The page under the title row: the Device's claim while one is asking, else the code or why there is none.
function CodePage(props: PairDeviceSheetProps): React.JSX.Element {
  const { asking, code } = props;

  if (asking) return <AskingClaim asking={asking} />;

  if (code.status === 'live') return <LiveCode code={code} />;

  return <Text role="secondary">{messages[code.status]}</Text>;
}

type LiveCode = Extract<PairingCodeLoad, { status: 'live' }>;

// The code, and the digits that stand for it so a Device with no camera has something to type (#1502).
function LiveCode(props: { code: LiveCode }): React.JSX.Element {
  return (
    <Stack direction="column" gap={4}>
      <CodeFigure code={props.code} />
      <Text role="secondary">{scanInstruction}</Text>
    </Stack>
  );
}

/*
 * The code and its digits are one figure, centred on the page as a picture is; the words around it stay on the
 * page's leading edge, where the rest of the App puts them.
 */
function CodeFigure(props: { code: LiveCode }): React.JSX.Element {
  return (
    <Stack direction="column" gap={3} align="center">
      <PairingQrCode invite={props.code.invite} size={codeSize} />
      <Text role="title" selectable>
        {spaced(props.code.invite.ticket)}
      </Text>
    </Stack>
  );
}

// Half the digits, a gap, the other half: the way someone reads a code aloud and the way they type it.
const halfOfATicket = pairingTicketDigits / 2;

const spaced = (ticket: string): string =>
  `${ticket.slice(0, halfOfATicket)} ${ticket.slice(halfOfATicket)}`;

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
        'gap-2 px-4 pt-4 pb-2',
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
