import type { SessionRowItem as Item } from '@repo/contracts/plugins/wire';
import { Text } from '@repo/kit/primitives/content/text';
import { Tooltip } from '@repo/kit/primitives/overlays/tooltip';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { Pressable } from 'react-native';

// One Plugin item as Argo draws it: its text in its tone, with its tooltip on hover where there is a pointer.
export function SessionRowItem({ item }: { item: Item }): React.ReactNode {
  const text = <ItemText item={item} />;

  if (item.tooltip === undefined) return text;

  return (
    <SizeClass
      compact={text}
      wide={
        <Tooltip label={item.tooltip}>
          <Pressable accessibilityHint={item.tooltip}>{text}</Pressable>
        </Tooltip>
      }
    />
  );
}

function ItemText({ item }: { item: Item }): React.JSX.Element {
  return (
    <Text
      role="secondary"
      tone={item.tone ?? 'muted'}
      accessibilityHint={item.tooltip}
    >
      {item.text}
    </Text>
  );
}
