import { writePairingInvite, type PairingInvite } from '@repo/contracts';
import qrcode from 'qrcode-generator';
import type * as React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';

export interface PairingQrCodeProps {
  invite: PairingInvite;
  // The square the code is drawn in, in points. The modules divide it, so the code stays sharp at any size.
  size: number;
}

type Modules = ReturnType<typeof qrcode>;

// `M` corrects about 15% of the code, which is what a phone camera reading a screen from arm's length wants; the automatic version is the smallest that holds the invite.
const correction = 'M';

// The border of four empty modules the QR specification asks for: a scanner needs the code to end somewhere.
const quiet = 4;

// Black on white in both themes, because a camera reads a code by contrast rather than by taste.
const codeColours = ['--color-code-light', '--color-code-dark'];

function modulesOf(invite: PairingInvite): Modules {
  const code = qrcode(0, correction);
  code.addData(writePairingInvite(invite));
  code.make();

  return code;
}

const square = (row: number, column: number): string =>
  `M${column + quiet} ${row + quiet}h1v1h-1z`;

// Every dark module as one path, so the whole code is a single drawing rather than a few hundred.
function darkModules(code: Modules): string {
  const lines = [...Array.from({ length: code.getModuleCount() }).keys()];

  return lines
    .flatMap((row) =>
      lines.flatMap((column) =>
        code.isDark(row, column) ? [square(row, column)] : [],
      ),
    )
    .join('');
}

/*
 * The Pairing Ticket's invite as a QR code: the Server's static public key, its discovery name and the Ticket, which is everything a Device needs to find this Server and prove it is the right one (ADR-0045).
 * It is drawn and never stored: when the Ticket runs out the sheet mints another and draws that one instead.
 */
export function PairingQrCode(props: PairingQrCodeProps): React.JSX.Element {
  const code = modulesOf(props.invite);
  const side = code.getModuleCount() + quiet * 2;
  const [light, dark] = useCSSVariable(codeColours);
  const box = `0 0 ${side} ${side}`;

  return (
    <View accessibilityRole="image" accessibilityLabel="Pairing QR code">
      <Svg width={props.size} height={props.size} viewBox={box}>
        <Rect width={side} height={side} fill={String(light)} />
        <Path d={darkModules(code)} fill={String(dark)} />
      </Svg>
    </View>
  );
}
