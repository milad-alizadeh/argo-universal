import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';

export interface CodeScannerProps {
  // The live camera, filling the frame; nothing where there is none, as in a browser or a preview.
  preview?: ReactNode;
  // What the scanner is doing, at the frame's foot: looking, a code it read and refused, or a camera that did not start.
  notice: string;
  // What to do, under the frame.
  title: string;
  // Where to find the code, under the title.
  detail: string;
}

// White in both appearances, as the marks are drawn over a camera picture.
const corner = 'absolute size-11 border-code-light';

const corners = [
  'left-0 top-0 rounded-tl-2xl border-l-4 border-t-4',
  'right-0 top-0 rounded-tr-2xl border-r-4 border-t-4',
  'bottom-0 left-0 rounded-bl-2xl border-b-4 border-l-4',
  'bottom-0 right-0 rounded-br-2xl border-b-4 border-r-4',
];

// The square the code is held in, centred over the camera.
function Viewfinder(): ReactElement {
  return (
    <View
      className="pointer-events-none absolute inset-0 items-center justify-center"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View className="size-48">
        {corners.map((place) => (
          <View key={place} className={`${corner} ${place}`} />
        ))}
      </View>
    </View>
  );
}

/*
 * Small white words on a dim backing that keeps them readable over a bright picture without covering it. A long
 * refusal wraps in full, and a screen reader hears each change.
 */
function Notice({ text }: { text: string }): ReactElement {
  return (
    <View className="max-w-full rounded-full bg-scrim/60 px-2.5 py-1">
      <Text
        role="badge"
        className="text-center text-code-light"
        accessibilityLiveRegion="polite"
      >
        {text}
      </Text>
    </View>
  );
}

function Frame(
  props: Pick<CodeScannerProps, 'preview' | 'notice'>,
): ReactElement {
  return (
    <View className="aspect-square w-full max-w-sm self-center overflow-hidden rounded-2xl bg-scrim">
      {props.preview}
      <Viewfinder />
      <View className="pointer-events-none absolute inset-x-0 bottom-5 items-center px-4">
        <Notice text={props.notice} />
      </View>
    </View>
  );
}

function Caption(
  props: Pick<CodeScannerProps, 'title' | 'detail'>,
): ReactElement {
  return (
    <View className="items-center gap-1">
      <Text role="heading" accessibilityRole="heading" aria-level={2}>
        {props.title}
      </Text>
      <Text role="secondary" tone="muted">
        {props.detail}
      </Text>
    </View>
  );
}

/*
 * A camera reading a code: the picture in a rounded dark frame, a square of corner marks to hold the code in, what it
 * is doing at the frame's foot, and what to do under it. The frame is square and capped rather than filling the page,
 * so the words under it stay in sight on any phone.
 */
export function CodeScanner(props: CodeScannerProps): ReactElement {
  return (
    <View className="gap-4">
      <Frame preview={props.preview} notice={props.notice} />
      <Caption title={props.title} detail={props.detail} />
    </View>
  );
}
