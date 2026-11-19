import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type { RichTextareaProps } from '@repo/kit/primitives/controls/rich-textarea';
import type { ComponentProps, JSX } from 'react';
import { View } from 'react-native';

type AcceptanceProps = {
  suggestion: RichTextareaProps['inlineSuggestion'];
  phone: boolean;
  onAccept: (text: string) => void;
};

// The Send button's size and shape, so the key and Send read as one family down the card's trailing edge.
const keyLook = { variant: 'secondary', size: 'sm', control: true } as const;

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
    <View className="shrink-0 pr-2.5 pt-1.5">
      <IconButton {...keyLook} {...keyAction(suggestion, onAccept)} />
    </View>
  );
}

const keyAction = (
  { text }: NonNullable<AcceptanceProps['suggestion']>,
  accept: AcceptanceProps['onAccept'],
): Pick<
  ComponentProps<typeof IconButton>,
  'icon' | 'accessibilityLabel' | 'onPress'
> => ({
  icon: 'return',
  accessibilityLabel: `Use ${text}`,
  onPress: () => accept(text),
});
