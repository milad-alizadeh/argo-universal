import {
  RichTextarea,
  SuggestionListHost,
} from '@repo/kit/primitives/controls/rich-textarea';
import type * as React from 'react';
import { View } from 'react-native';
import { useFollowUpSuggestion } from '../../hooks/use-follow-up-suggestion';
import type { CardLayout, TextLayout } from './composer-card-types';
import { FollowUpAcceptance } from './composer-follow-up-acceptance';
import { ComposerSurface } from './composer-surface';
import { draftChanges, useSuggestionSources } from './composer-text-draft';
import { ComposerBottomTray } from './composer-trays';

/*
 * `min-h-0 shrink`, so the card gives height up to the room left above the keyboard rather than running on
 * past it. Inside the card only the draft field gives any up; the toolbar keeps its own (#1529).
 */
function ComposerCard(layout: CardLayout): React.JSX.Element {
  const field = useComposerText(layout);
  const phone = !layout.wide;

  return (
    <>
      <FollowUpAcceptance
        suggestion={field.inlineSuggestion}
        phone={phone}
        onAccept={layout.field.insertWord}
      />
      <ComposerSurface layout={layout} field={field} phone={phone} />
    </>
  );
}

type MessageField = React.ComponentProps<typeof RichTextarea>;

function useComposerText(layout: TextLayout): MessageField {
  const suggestions = useSuggestionSources(layout.props);
  const followUp = useFollowUpSuggestion(layout.props, layout.inactive);
  const props = { ...layout.props, onDraftChange: followUp.changeDraft };

  return {
    ...textInputProps({ ...layout, props }),
    inlineSuggestion: followUp.inlineSuggestion,
    ref: layout.field.attach,
    suggestions,
  };
}

// The padding sits on the field, so a press anywhere in the white area focuses it.
const textFieldLook = {
  accessibilityLabel: 'Message',
  fieldClassName: 'px-4 wide:px-4.75 pt-3 pb-2',
} as const;

function textInputProps({
  props,
  inactive,
  send,
}: Omit<TextLayout, 'field'>): React.ComponentProps<typeof RichTextarea> {
  return {
    ...textFieldLook,
    autoFocus: !inactive,
    placeholder: props.placeholder ?? '',
    value: props.draft.text,
    disabled: inactive,
    ...draftChanges(props),
    onSubmit: send,
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
