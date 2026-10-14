import { HStack, Text, Toggle } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonStyle,
  disabled,
  foregroundStyle,
  toggleStyle,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { ControlHost } from '#primitives/native/native-control';
import {
  capsuleButtonBorder,
  optionalTint,
} from '#primitives/native/native-modifiers';
import { type FilterPillProps, filterPillText } from './filter-pill-props';

// iOS: SwiftUI's own button-style Toggle, a bordered capsule; on, it is the prominent capsule in Argo's primary tint.
export function FilterPill(props: FilterPillProps): React.JSX.Element {
  return (
    <ControlHost matchContents>
      <Toggle
        isOn={props.value}
        onIsOnChange={props.onValueChange}
        modifiers={usePillModifiers(props)}
      >
        <PillLabel {...props} />
      </Toggle>
    </ControlHost>
  );
}

function usePillModifiers(
  props: FilterPillProps,
): React.ComponentProps<typeof Toggle>['modifiers'] {
  const { primary } = useNativeTheme().colors;

  return [
    toggleStyle('button'),
    buttonStyle(props.value ? 'borderedProminent' : 'bordered'),
    capsuleButtonBorder(),
    ...optionalTint(primary),
    disabled(!!props.disabled),
    accessibilityLabel(filterPillText(props).join(', ')),
  ];
}

const secondary = [
  foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
];

// The label, then its count in the system's secondary style.
function PillLabel(props: FilterPillProps): React.JSX.Element {
  const [label, count] = filterPillText(props);

  return (
    <HStack spacing={6}>
      <Text>{label}</Text>
      {count !== undefined && <Text modifiers={secondary}>{count}</Text>}
    </HStack>
  );
}

FilterPill satisfies React.ComponentType<FilterPillProps>;
