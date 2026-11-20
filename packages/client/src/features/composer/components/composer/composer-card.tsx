import {
  RichTextarea,
  SuggestionListHost,
} from '@repo/kit/primitives/controls/rich-textarea';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import { useFollowUpSuggestion } from '../../hooks/use-follow-up-suggestion';
import type { CardLayout, TextLayout } from './composer-card-types';
import { edgeOf } from './composer-edge';
import { ComposerSurface } from './composer-surface';
import { draftChanges, useSuggestionSources } from './composer-text-draft';
import { ComposerBottomTray } from './composer-trays';

/*
 * `min-h-0 shrink`, so the card gives height up to the room left above the keyboard rather than running on
 * past it. Inside the card the draft body shrinks; the toolbar keeps its height (#1529).
 */
function ComposerCard(layout: CardLayout): React.JSX.Element {
  const field = useComposerText(layout);
  const phone = !layout.wide;

  return <ComposerSurface layout={layout} field={field} phone={phone} />;
}

type MessageField = React.ComponentProps<typeof RichTextarea>;

function useComposerText(layout: TextLayout): MessageField {
  const suggestions = useSuggestionSources(layout.props);
  const followUp = useFollowUpSuggestion(layout.props, layout.inactive);

  return {
    ...textInputProps(layout),
    inlineSuggestion: followUp.inlineSuggestion,
    ref: layout.field.attach,
    suggestions,
  };
}

// The padding sits on the field, so a press anywhere in the white area focuses it.
const fieldClass = 'px-4 wide:px-4.75 pb-2 type-body';

// Under a call's edge band the field starts 6 points down, as Paper draws it; otherwise 12.
const fieldClassOf = (props: TextLayout['props']): string =>
  cn(fieldClass, edgeOf(props) ? 'pt-1.5' : 'pt-3');

function textInputProps(layout: Omit<TextLayout, 'field'>): MessageField {
  const { props, inactive, send, modifiedSend } = layout;

  return {
    accessibilityLabel: 'Message',
    fieldClassName: fieldClassOf(props),
    autoFocus: !inactive,
    placeholder: props.placeholder ?? '',
    value: props.draft.text,
    disabled: inactive,
    ...draftChanges(props),
    onSubmit: send,
    onModifiedSubmit: modifiedSend,
  };
}

export function ComposerControls(layout: CardLayout): React.JSX.Element {
  return (
    <View className="w-full min-h-0 shrink">
      <SuggestionListHost />
      <ComposerCard {...layout} />
      <ComposerBottomTray {...layout} />
    </View>
  );
}
