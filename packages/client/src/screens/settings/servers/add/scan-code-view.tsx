import { Button } from '@repo/kit/primitives/actions/button';
import { PinnedFooter } from '@repo/kit/primitives/scaffolds/pinned-footer';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type * as React from 'react';
import { type ReactNode } from 'react';

export interface ScanCodeViewProps {
  // Whether Argo may use the camera: not asked yet, refused, or allowed.
  access: 'ask' | 'refused' | 'allowed';
  // The live camera, drawn once it is allowed; it carries the words that say what it is looking for.
  camera?: ReactNode;
  onContinue: () => void;
  onOpenSettings: () => void;
  // The way to a page that takes the code typed, for a phone whose camera cannot reach the other screen (#1502).
  onEnterCode?: () => void;
}

const words = {
  ask: {
    title: 'Scan a code to connect',
    description:
      'On your computer, open Settings › Devices and press Pair a Device. Argo uses the camera only to read that code.',
    button: 'Continue',
    press: 'onContinue',
  },
  refused: {
    title: 'Camera access is off',
    description:
      'Argo needs the camera to read the code on your computer. Turn it on in Settings, then come back here.',
    button: 'Open Settings',
    press: 'onOpenSettings',
  },
} as const;

/*
 * Reading the code on the other computer's screen, with "Enter code instead" at the foot as the approved Scanning design has it (#1490). The camera is asked for only after a page that says why (#1490): the owner has just pressed Add a Server and may not expect it.
 */
export function ScanCodeView(props: ScanCodeViewProps): React.JSX.Element {
  return (
    <Screen title="Add a Server">
      <PinnedFooter footer={enterCodeButton(props)}>{body(props)}</PinnedFooter>
    </Screen>
  );
}

const body = (props: ScanCodeViewProps): ReactNode =>
  props.access === 'allowed' ? (
    props.camera
  ) : (
    <Explanation {...props} access={props.access} />
  );

const enterCodeButton = (props: ScanCodeViewProps): ReactNode =>
  props.onEnterCode ? (
    <Button
      label="Enter code instead"
      variant="secondary"
      fullWidth
      onPress={props.onEnterCode}
    />
  ) : null;

function Explanation(
  props: ScanCodeViewProps & { access: 'ask' | 'refused' },
): React.JSX.Element {
  const copy = words[props.access];

  return (
    <EmptyState
      icon="camera"
      title={copy.title}
      description={copy.description}
      action={<Button label={copy.button} onPress={props[copy.press]} />}
    />
  );
}
