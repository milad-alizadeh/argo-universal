import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { Pressable } from 'react-native';

interface Props {
  hidden: number;
  onOpen: () => void;
}

const pressable = ({ hidden, onOpen }: Props) =>
  ({
    role: 'button',
    accessibilityLabel: `Show ${hidden} more`,
    onPress: onOpen,
    className:
      'rounded-control px-2 py-2 web:hover:bg-hover web:focus-visible:bg-hover',
  }) as const;

// The footer of a card whose preview left items out: it opens the section's full list in the Inspector.
export function WorkbenchShowMore(props: Props): ReactElement | null {
  if (props.hidden <= 0) return null;

  return (
    <Pressable {...pressable(props)}>
      <Text role="secondary" tone="muted">
        Show {props.hidden} more
      </Text>
    </Pressable>
  );
}
