import { CodeScanner } from '@repo/kit/primitives/content/code-scanner';
import {
  CapsuleButton,
  CodeBlock,
  EvidenceCard,
  PairingSheet,
  SheetField,
} from '@repo/kit/primitives/scaffolds/pairing-sheet';
import { PinnedFooter } from '@repo/kit/primitives/scaffolds/pinned-footer';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { useState } from 'react';
import {
  type Evidence,
  type PairSheetKind,
  pairSheetCopy,
} from './pair-sheet-copy';
import { looking, scannerProps } from './scan-notice';

export interface PairSheetViewProps {
  kind: PairSheetKind;
  // The discovery name the code carried.
  serverName: string;
  onOpenSettings: () => void;
  // Leaves Add a Server for the Server list.
  onBack: () => void;
  // Looks again; with the address the owner typed, where there is a field for one.
  onTryAgain: (address: string) => void;
  // Stops looking, or goes back to the camera.
  onCancel: () => void;
}

/*
 * Every page that stops Add a Server short of a Server is one bottom sheet over the dimmed scanner it came from, with the brackets still showing behind it (Pairing pages, direction B). The sheet says what is wrong, shows where the owner acts, and stacks the answers as pills.
 */
export function PairSheetView(props: PairSheetViewProps): React.JSX.Element {
  return (
    <Screen title="Add a Server">
      <Behind />
      <Sheet {...props} />
    </Screen>
  );
}

function Sheet(props: PairSheetViewProps): React.JSX.Element {
  const [address, setAddress] = useState('');
  const copy = pairSheetCopy(props.kind, props.serverName);
  const typed = { address, onChange: setAddress };

  return (
    <PairingSheet {...copy} actions={answers[props.kind](props, address)}>
      {copy.evidence && <EvidenceView evidence={copy.evidence} typed={typed} />}
    </PairingSheet>
  );
}

// The scanner the sheet lies over, dark where a phone draws the live camera.
const Behind = (): React.JSX.Element => (
  <PinnedFooter footer={null}>
    <CodeScanner {...scannerProps(looking)} />
  </PinnedFooter>
);

interface AddressState {
  address: string;
  onChange: (address: string) => void;
}

function EvidenceView(props: {
  evidence: Evidence;
  typed: AddressState;
}): React.JSX.Element {
  const { evidence, typed } = props;

  if (evidence.kind === 'settings') return <EvidenceCard {...evidence} />;

  if (evidence.kind === 'code') return <CodeBlock {...evidence} />;

  return (
    <SheetField
      {...evidence}
      value={typed.address}
      onChangeText={typed.onChange}
    />
  );
}

const pill = (
  label: string,
  onPress: () => void,
  variant?: 'primary',
): React.JSX.Element => (
  <CapsuleButton
    key={label}
    label={label}
    variant={variant}
    onPress={onPress}
  />
);

type Answers = (
  props: PairSheetViewProps,
  address: string,
) => React.JSX.Element[];

const answers: Record<PairSheetKind, Answers> = {
  denied: (props) => [
    pill('Open Settings', props.onOpenSettings, 'primary'),
    pill('Back to Servers', props.onBack),
  ],
  undetermined: (props) => [
    pill('Open Settings', props.onOpenSettings, 'primary'),
    pill('Try Again', () => props.onTryAgain('')),
  ],
  misconfigured: (props) => [pill('Back to Servers', props.onBack, 'primary')],
  finding: (props) => [pill('Cancel', props.onCancel)],
  'not-found': (props, address) => [
    pill('Try Again', () => props.onTryAgain(address), 'primary'),
    pill('Scan Again', props.onCancel),
  ],
};
