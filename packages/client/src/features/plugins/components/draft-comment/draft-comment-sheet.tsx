import { Sheet } from '@repo/kit/primitives/overlays/sheet';
import { useWide } from '@repo/kit/use-wide/use-wide';
import type * as React from 'react';
import { Pressable } from 'react-native';
import {
  DraftCommentEditor,
  type DraftCommentEditorProps,
} from './draft-comment-editor';

// Where the node is, in the box the sheet's popover is placed against.
export type Anchor = { x: number; y: number; width: number; height: number };

export type DraftCommentSheetProps = Omit<
  DraftCommentEditorProps,
  'longPressed'
> & {
  open: boolean;
  anchor: Anchor;
};

/*
 * The editor where the author's window puts it: a wide window opens a popover on the node, below its start, and a
 * phone raises a sheet from the bottom edge. The node's own box is the popover's trigger, which takes no touch.
 */
export function DraftCommentSheet({
  open,
  anchor,
  ...editor
}: DraftCommentSheetProps): React.JSX.Element {
  const wide = useWide();

  return (
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
      <DraftCommentEditor {...editor} longPressed={!wide} />
    </Sheet>
  );
}
