import { Host, Toggle } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as accessibilityLabelModifier,
  disabled as disabledModifier,
  labelsHidden,
  tint,
  toggleStyle,
} from '@expo/ui/swift-ui/modifiers';
import type * as SwitchPrimitives from '@rn-primitives/switch';
import type * as React from 'react';
import { useResolveClassNames } from 'uniwind';

// The system switch, so it draws with the platform's glass.
function Switch({
  checked,
  onCheckedChange,
  disabled,
  accessibilityLabel,
}: React.ComponentProps<typeof SwitchPrimitives.Root> & {
  size?: 'default' | 'small';
}): React.JSX.Element {
  const primary = useResolveClassNames('text-primary').color;
  return (
    <Host matchContents>
      <Toggle
        isOn={checked}
        onIsOnChange={onCheckedChange}
        modifiers={[
          toggleStyle('switch'),
          labelsHidden(),
          disabledModifier(!!disabled),
          ...(accessibilityLabel
            ? [accessibilityLabelModifier(accessibilityLabel)]
            : []),
          ...(typeof primary === 'string' ? [tint(primary)] : []),
        ]}
      />
    </Host>
  );
}

export { Switch };
