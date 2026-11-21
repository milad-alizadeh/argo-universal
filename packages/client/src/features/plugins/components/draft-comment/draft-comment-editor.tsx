import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { TextArea } from '@repo/kit/primitives/controls/text-area';
import type * as React from 'react';
import { View } from 'react-native';

export interface DraftCommentEditorProps {
  title: string;
  note: string;
  longPressed: boolean;
  onNoteChange: (note: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

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
        <View className={longPressed ? 'flex-1' : undefined}>
          <Button
            label="Cancel"
            variant="secondary"
            size={size}
            fullWidth={longPressed}
            onPress={onCancel}
          />
        </View>
        <View className={longPressed ? 'flex-1' : undefined}>
          <Button
            label="Comment"
            size={size}
            fullWidth={longPressed}
            disabled={note.trim() === ''}
            onPress={onSave}
          />
        </View>
      </View>
    </View>
  );
}
