import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { type LexicalEditor, mergeRegister } from 'lexical';
import type * as React from 'react';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { FormatBar, type FormatBarProps } from '../rich-textarea-format-bar';
import {
  $appliedFormats,
  applyFormat,
  type Format,
} from './rich-textarea-formats';
import { trackMouseSelection } from './rich-textarea-mouse-selection';
import { placementInField, selectedRect } from './rich-textarea-placement';
import { $rangeSelection } from './rich-textarea-selection';

type ShownBar = FormatBarProps['shown'];

function shownPlacement(
  editor: LexicalEditor,
): ReturnType<typeof placementInField> {
  const rect = selectedRect();
  return rect && placementInField(editor, rect);
}

function $shownBar(editor: LexicalEditor): ShownBar {
  const selection = $rangeSelection({ collapsed: false });
  const placement = shownPlacement(editor);
  if (!selection || !placement) return undefined;
  return { placement, applied: $appliedFormats(selection) };
}

interface BarSink {
  show: (bar: ShownBar) => void;
  isMouseSelection: RefObject<boolean>;
}

function barRefresher(
  editor: LexicalEditor,
  { show, isMouseSelection }: BarSink,
): () => void {
  const read = (): ShownBar =>
    editor.getEditorState().read(() => $shownBar(editor));
  return () => show(isMouseSelection.current ? read() : undefined);
}

// The bar follows every edit and selection change while the selection is the mouse's.
function registerFormatBar(editor: LexicalEditor, sink: BarSink): () => void {
  const refresh = barRefresher(editor, sink);
  const follow = (mouse: boolean): void => {
    sink.isMouseSelection.current = mouse;
    refresh();
  };
  return mergeRegister(
    trackMouseSelection(editor, follow),
    editor.registerUpdateListener(refresh),
  );
}

interface FormatBarState {
  shown: ShownBar;
  close: () => void;
}

function useFormatBar(editor: LexicalEditor): FormatBarState {
  const [shown, setShown] = useState<ShownBar>();
  const isMouseSelection = useRef(false);
  useEffect(
    () => registerFormatBar(editor, { show: setShown, isMouseSelection }),
    [editor],
  );
  const close = (): void => {
    isMouseSelection.current = false;
    setShown(undefined);
  };
  return { shown, close };
}

// The format bar over a mouse selection; Link hands the selection to the link editor.
export function FormatBarPlugin(): React.JSX.Element {
  const [editor] = useLexicalComposerContext();
  const { shown, close } = useFormatBar(editor);
  const applied = shown?.applied ?? [];
  const format = (chosen: Format): void => {
    if (chosen === 'link') close();
    applyFormat(editor, { format: chosen, applied: applied.includes(chosen) });
  };
  return <FormatBar shown={shown} onFormat={format} onClose={close} />;
}
