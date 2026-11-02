import type { MintedPairingTicket, PairingRegistration } from '@repo/contracts';
import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { Sheet, type SheetProps } from '@repo/kit/primitives/overlays/sheet';
import type * as React from 'react';
import { View } from 'react-native';
import { AskingClaim } from './pair-device-claim';
import { SheetActions } from './pair-device-footer';
import { PairingCode } from './pairing-code';

/*
 * Where the Server's answer has got to. A sheet holds at most one live code, and never two at once.
 * An expired code keeps the Ticket it had, so the sheet can show it dimmed rather than leave a hole where it was.
 */
export type PairingCodeLoad =
  | { status: 'minting' | 'error' }
  | ({ status: 'live' | 'expired' } & MintedPairingTicket);

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
  asking ? 'Allow this Device?' : title;

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

  return asking ? (
    <AskingClaim asking={asking} />
  ) : (
    <CodeOrMessage code={code} />
  );
}

function CodeOrMessage(props: { code: PairingCodeLoad }): React.JSX.Element {
  const { code } = props;

  if (code.status === 'live' || code.status === 'expired')
    return <PairingCode code={code} expired={code.status === 'expired'} />;

  return <Text role="secondary">{messages[code.status]}</Text>;
}
