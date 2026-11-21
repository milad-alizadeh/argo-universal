import { Sheet } from '@repo/kit/primitives/overlays/sheet';
import type * as React from 'react';
import { Pressable, View } from 'react-native';
import {
  DraftCommentEditor,
  type DraftCommentEditorProps,
} from './draft-comment-editor';

export type Anchor = { x: number; y: number; width: number; height: number };

export type DraftCommentSheetProps = DraftCommentEditorProps & {
  open: boolean;
  anchor: Anchor;
};

export function DraftCommentSheet({
  open,
  anchor,
  ...editor
}: DraftCommentSheetProps): React.JSX.Element {
  return (
    <View pointerEvents="box-none" className="absolute inset-0">
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) editor.onCancel();
        }}
        label="Comment"
        inset
        popoverPlacement={{ side: 'bottom', align: 'start' }}
        trigger={
          <Pressable
            accessible={false}
            focusable={false}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: anchor.x,
              top: anchor.y,
              width: anchor.width,
              height: anchor.height,
            }}
          />
        }
      >
        <DraftCommentEditor {...editor} />
      </Sheet>
    </View>
  );
}
