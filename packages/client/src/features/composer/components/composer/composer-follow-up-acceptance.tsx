import { buttonInteractionProps } from '@repo/kit/primitives/actions/pressable';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type { RichTextareaProps } from '@repo/kit/primitives/controls/rich-textarea';
import type { ComponentProps, JSX } from 'react';
import { Pressable, View } from 'react-native';
import { ComposerTypography } from './composer-typography';

type Suggestion = NonNullable<RichTextareaProps['inlineSuggestion']>;

type AcceptanceProps = {
  suggestion: RichTextareaProps['inlineSuggestion'];
  phone: boolean;
  onAccept: (text: string) => void;
};

/*
 * The phone's Tab. The Follow-up suggestion is the empty field's placeholder, as on the web, and this key at
 * the end of the text row writes it into the draft. The web accepts with Tab, so it draws no key.
 */
export function FollowUpAcceptance({
  suggestion,
  phone,
  onAccept,
}: AcceptanceProps): JSX.Element | null {
  if (!suggestion || !phone) return null;

  return (
    <ComposerTypography compact>
      <Pressable {...keyProps(suggestion, onAccept)}>
        {({ pressed }) => <UseKey pressed={pressed} />}
      </Pressable>
    </ComposerTypography>
  );
}

function keyProps(
  suggestion: Suggestion,
  accept: (text: string) => void,
): ComponentProps<typeof Pressable> {
  return {
    ...buttonInteractionProps({}),
    accessibilityLabel: `Use ${suggestion.text}`,
    onPress: () => accept(suggestion.text),
    className: 'min-h-11 min-w-11 shrink-0 items-center justify-center pr-3',
  };
}

const keyClass = 'flex-row items-center gap-1 rounded-sm px-2 py-1';

function UseKey({ pressed }: { pressed: boolean }): JSX.Element {
  return (
    <View className={`${keyClass} ${pressed ? 'bg-pressed' : 'bg-tint'}`}>
      <Icon name="return" size="sm" tone="muted" />
      <Text role="badge" tone="muted">
        Use
      </Text>
    </View>
  );
}
