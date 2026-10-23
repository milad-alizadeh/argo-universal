// TEMPORARY: stock SwiftUI glass buttons, to measure Apple's own sizes; delete with the Probe story.
import { Button, HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI's own modifier name.
  buttonBorderShape,
  buttonStyle,
  controlSize,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { Host } from '#primitives/native/host';

const controlSizes = [
  'mini',
  'small',
  'regular',
  'large',
  'extraLarge',
] as const;

const stock = (
  size: (typeof controlSizes)[number],
): ReturnType<typeof buttonStyle>[] => [
  buttonStyle('glassProminent'),
  controlSize(size),
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI's own modifier name.
  buttonBorderShape('circle'),
];

export function StockProbe(): ReactElement {
  return (
    <Host matchContents>
      <HStack spacing={16}>{controlSizes.map(stockColumn)}</HStack>
    </Host>
  );
}

function stockColumn(size: (typeof controlSizes)[number]): ReactElement {
  return (
    <VStack key={size} spacing={8}>
      <Button
        label="New session"
        systemImage="square.and.pencil"
        modifiers={[...stock(size), labelStyle('iconOnly')]}
      />
      <Text>{size}</Text>
    </VStack>
  );
}
