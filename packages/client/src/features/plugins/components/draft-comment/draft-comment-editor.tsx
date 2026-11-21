import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { TextArea } from '@repo/kit/primitives/controls/text-area';
import type * as React from 'react';
import { View } from 'react-native';

export interface DraftCommentEditorProps {
  // The node being commented on, as the region's tag names it.
  title: string;
  note: string;
  // A phone's sheet opens on a long press, which it says; a pointer's popover does not.
  longPressed: boolean;
  onNoteChange: (note: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

// The note an author leaves on a node, in the popover beside it or the phone's sheet. A comment is a one-way note: it has no replies and is not resolved.
export function DraftCommentEditor(
  props: DraftCommentEditorProps,
): React.JSX.Element {
  const { title, note, longPressed, onNoteChange, onSave, onCancel } = props;
  const size = longPressed ? 'md' : 'sm';

  return (
    <View className="gap-2.5">
      <Text role="badge" tone="muted">
        {longPressed ? `Long-pressed · ${title}` : title}
      </Text>
      <TextArea
        label="Comment"
        placeholder="Leave a note for the Agent"
        value={note}
        onChangeText={onNoteChange}
      />
      <View
        className={
          longPressed ? 'flex-row gap-2' : 'flex-row justify-end gap-2'
        }
      >
        <Button
          label="Cancel"
          variant="secondary"
          size={size}
          fullWidth={longPressed}
          onPress={onCancel}
        />
        <Button
          label="Comment"
          size={size}
          fullWidth={longPressed}
          disabled={note.trim() === ''}
          onPress={onSave}
        />
      </View>
    </View>
  );
}
