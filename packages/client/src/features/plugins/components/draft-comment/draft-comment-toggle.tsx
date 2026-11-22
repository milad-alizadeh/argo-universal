import {
  FixedSizeChrome,
  IconButton,
} from '@repo/kit/primitives/actions/icon-button';
import { Icon } from '@repo/kit/primitives/content/icon';
import type { ReactElement } from 'react';
import { Pressable } from 'react-native';
import { useUniwind } from 'uniwind';

const label = 'Comments';

type ToggleProps = { selected: boolean; onPress: () => void };

export function DraftCommentToggle(props: ToggleProps): ReactElement {
  const { theme } = useUniwind();

  return theme === 'dark' ? (
    <DarkCommentToggle {...props} />
  ) : (
    <IconButton
      {...props}
      icon="message"
      accessibilityLabel={label}
      aria-pressed={props.selected}
      size="md"
      variant="secondary"
    />
  );
}

function DarkCommentToggle({ selected, onPress }: ToggleProps): ReactElement {
  const look = selected
    ? 'border-draft-comment-border bg-draft-comment-selected'
    : 'border-transparent bg-muted web:hover:bg-muted-hover';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-pressed={selected}
      onPress={onPress}
      className={`size-draft-comment-toggle shrink-0 items-center justify-center rounded-control border ${look}`}
    >
      <FixedSizeChrome>
        <Icon name="message" size="sm" filled={selected} />
      </FixedSizeChrome>
    </Pressable>
  );
}
