import { Button } from '@repo/kit/primitives/actions/button';
import type { RichTextareaProps } from '@repo/kit/primitives/controls/rich-textarea';
import type { JSX } from 'react';
import { View } from 'react-native';

const acceptanceLook = { variant: 'secondary', size: 'sm' } as const;

type AcceptanceProps = {
  suggestion: RichTextareaProps['inlineSuggestion'];
  phone: boolean;
  onAccept: (text: string) => void;
};

export function FollowUpAcceptance({
  suggestion,
  phone,
  onAccept,
}: AcceptanceProps): JSX.Element | null {
  if (!suggestion) return null;

  if (!phone) return null;

  return (
    <View className="items-start px-4 pb-2">
      <Button {...acceptanceLook} {...chipProps(suggestion, onAccept)} />
    </View>
  );
}

function chipProps(
  suggestion: NonNullable<RichTextareaProps['inlineSuggestion']>,
  accept: (text: string) => void,
): Pick<React.ComponentProps<typeof Button>, 'label' | 'onPress'> {
  return { label: suggestion.text, onPress: () => accept(suggestion.text) };
}
