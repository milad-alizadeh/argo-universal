import {
  pairingTicketDigits,
  type MintedPairingTicket,
  type PairingRegistration,
} from '@repo/contracts';
import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import { Sheet, type SheetProps } from '@repo/kit/primitives/overlays/sheet';
import type * as React from 'react';
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
      <Sheet.Screen name="pair" title={title}>
        <Stack direction="column" gap={4} align="center">
          {props.asking ? <AskingPrompt {...props} /> : <CodePage {...props} />}
        </Stack>
      </Sheet.Screen>
    </Sheet>
  );
}

const sheetProps = (
  props: PairDeviceSheetProps,
): Omit<SheetProps, 'children'> => ({
  open: props.open,
  onOpenChange: props.onOpenChange,
  label: title,
  inset: true,
});

function CodePage(props: PairDeviceSheetProps): React.JSX.Element {
  const { code } = props;

  if (code.status === 'live')
    return <LiveCode code={code} onNewCode={props.onNewCode} />;

  return <UnavailableCode status={code.status} onNewCode={props.onNewCode} />;
}

type LiveCode = Extract<PairingCodeLoad, { status: 'live' }>;

// The code, and the digits that stand for it so a Device with no camera has something to type (#1502).
function LiveCode(props: {
  code: LiveCode;
  onNewCode: () => void;
}): React.JSX.Element {
  return (
    <Stack direction="column" gap={4} align="center">
      <PairingQrCode invite={props.code.invite} size={codeSize} />
      <Text role="title" selectable>
        {spaced(props.code.invite.ticket)}
      </Text>
      <Text role="secondary">{scanInstruction}</Text>
    </Stack>
  );
}

// Half the digits, a gap, the other half: the way someone reads a code aloud and the way they type it.
const halfOfATicket = pairingTicketDigits / 2;

const spaced = (ticket: string): string =>
  `${ticket.slice(0, halfOfATicket)} ${ticket.slice(halfOfATicket)}`;

function UnavailableCode(props: {
  status: 'minting' | 'expired' | 'error';
  onNewCode: () => void;
}): React.JSX.Element {
  return (
    <Stack direction="column" gap={4} align="center">
      <Text role="secondary">{messages[props.status]}</Text>
      {props.status === 'minting' ? null : (
        <Button label="New code" variant="primary" onPress={props.onNewCode} />
      )}
    </Stack>
  );
}

/*
 * The owner's answer for the Device that turned up. The handshake has already run on a Ticket this sheet minted, so what the owner decides here is whether that Device keeps what it got: declining deletes its row.
 * The sheet asks rather than the handshake, because this is where the owner is already present and watching the code they asked for.
 */
function AskingPrompt(props: PairDeviceSheetProps): React.JSX.Element {
  const { asking } = props;

  if (!asking) return <CodePage {...props} />;

  return (
    <Stack direction="column" gap={4} align="center">
      <Text role="title" accessibilityRole="heading" aria-level={3}>
        {`${asking.claimedName} wants to pair`}
      </Text>
      <Text role="secondary">
        {`This Device says it is ${asking.claimedName}. Allow it only if you recognise it.`}
      </Text>
      <AskingAnswers {...props} asking={asking} />
    </Stack>
  );
}

type Answers = {
  asking: PairingRegistration;
  onAllow: PairDeviceSheetProps['onAllow'];
  onDecline: PairDeviceSheetProps['onDecline'];
};

function AskingAnswers(props: Answers): React.JSX.Element {
  const { asking, onAllow, onDecline } = props;

  return (
    <Stack direction="row" gap={2} align="center">
      <Button label="Allow" variant="primary" onPress={() => onAllow(asking)} />
      <Button
        label="Don't allow"
        variant="danger"
        onPress={() => onDecline(asking)}
      />
    </Stack>
  );
}
