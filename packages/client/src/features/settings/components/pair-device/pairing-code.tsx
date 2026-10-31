import { pairingTicketDigits, type MintedPairingTicket } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import type * as React from 'react';
import { View } from 'react-native';
import { PairingCountdown } from './pairing-countdown';
import { PairingQrCode } from './pairing-qr-code';

/*
 * The code is drawn at 216 inside the tile's own 16 of white, which is the 248 square the design asks for
 * and the quiet border a camera wants around a code.
 */
const codeSize = 216;

const scanHeading = 'Scan with Argo on your phone';

const scanInstruction =
  'Open Argo on the other Device, choose Add a Server, and point the camera here. You’ll confirm on this computer before anything is shared.';

const typeLabel = 'No camera? Type this code on the other Device';

/*
 * The live code: the picture of it on the leading edge and what to do with it beside that. A sheet too
 * narrow for two columns — a phone-width window, where the sheet is a drawer — sets them one above the other.
 */
export function PairingCode(props: {
  code: MintedPairingTicket;
}): React.JSX.Element {
  return (
    <View className="gap-6 medium:flex-row medium:items-center medium:gap-8">
      <CodeTile code={props.code} />
      <View className="gap-5 medium:flex-1">
        <ScanInstruction />
        <TypedCode ticket={props.code.invite.ticket} />
        <PairingCountdown expiresAt={props.code.expiresAt} />
      </View>
    </View>
  );
}

// What the code is for, in the words the owner needs before they pick their phone up.
function ScanInstruction(): React.JSX.Element {
  return (
    <Stack direction="column" gap={2}>
      <Text role="heading" accessibilityRole="heading" aria-level={2}>
        {scanHeading}
      </Text>
      <Text role="secondary">{scanInstruction}</Text>
    </Stack>
  );
}

// White under the code in both appearances, because a camera reads a code by contrast rather than by taste.
function CodeTile(props: { code: MintedPairingTicket }): React.JSX.Element {
  return (
    <View className="shrink-0 self-center rounded-xl border border-hairline bg-code-light p-4 medium:self-auto">
      <PairingQrCode invite={props.code.invite} size={codeSize} />
    </View>
  );
}

/*
 * The digits that stand for the code, for a Device whose camera cannot be used (#1502): a tile of its own,
 * so the thing to type is the thing that is boxed.
 */
function TypedCode(props: { ticket: string }): React.JSX.Element {
  return (
    <View className="gap-2 rounded-xl bg-tint p-4">
      <Text role="badge" tone="muted">
        {typeLabel}
      </Text>
      <Text role="title" selectable>
        {spaced(props.ticket)}
      </Text>
    </View>
  );
}

// Half the digits, a dot, the other half: the way someone reads a code aloud and the way they type it.
const halfOfATicket = pairingTicketDigits / 2;

const spaced = (ticket: string): string =>
  `${ticket.slice(0, halfOfATicket)} · ${ticket.slice(halfOfATicket)}`;
