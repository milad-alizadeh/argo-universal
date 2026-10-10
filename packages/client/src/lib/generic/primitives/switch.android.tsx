import { Host, Switch as ComposeSwitch } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as SwitchPrimitives from '@rn-primitives/switch';
import type * as React from 'react';
import { useResolveClassNames } from 'uniwind';

// The Material switch, in the app's primary colour instead of the Material theme's.
function Switch({
  checked,
  onCheckedChange,
  disabled,
  accessibilityLabel,
}: React.ComponentProps<typeof SwitchPrimitives.Root> & {
  size?: 'default' | 'small';
}): React.JSX.Element {
  const primary = useResolveClassNames('text-primary').color;
  const onPrimary = useResolveClassNames('text-primary-foreground').color;
  const track = typeof primary === 'string' ? primary : undefined;
  const thumb = typeof onPrimary === 'string' ? onPrimary : undefined;
  return (
    <Host matchContents>
      <ComposeSwitch
        value={checked}
        onCheckedChange={onCheckedChange}
        enabled={!disabled}
        colors={{
          checkedTrackColor: track,
          checkedBorderColor: track,
          checkedThumbColor: thumb,
        }}
        modifiers={
          accessibilityLabel
            ? [semantics({ contentDescription: accessibilityLabel })]
            : []
        }
      />
    </Host>
  );
}

export { Switch };
