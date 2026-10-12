import { createHeadlessEditor } from '@lexical/headless';
import { withDOM } from '@lexical/headless/dom';
import { $generateNodesFromDOM } from '@lexical/html';
import { $isLinkNode } from '@lexical/link';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $insertNodes,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical';
import {
  $exportMarkdown,
  $importMarkdown,
  richTextareaNodes,
} from '../src/lib/generic/primitives/inputs/rich-textarea/rich-textarea-markdown';
import { registerMarkdownOnly } from '../src/lib/generic/primitives/inputs/rich-textarea/rich-textarea-paste';

// The editor with the web drawing's nodes, without a DOM.
function headlessEditor(): LexicalEditor {
  return createHeadlessEditor({
    namespace: 'rich-textarea-test',
    nodes: richTextareaNodes,
    onError: (error) => {
      throw error;
    },
  });
}

// The editor filled and then read.
function filled<T>(
  fill: () => void,
  read: () => T,
  editor = headlessEditor(),
): T {
  editor.update(fill, { discrete: true });
  return editor.getEditorState().read(read);
}

// Import a draft, then export what it shows.
export function roundTrip(markdown: string): string {
  return filled(() => $importMarkdown(markdown), $exportMarkdown);
}

// The same, with the web drawing's clean-up of pasted formatting registered.
export function roundTripWithPasteCleanUp(markdown: string): string {
  const editor = headlessEditor();
  const stopCleanUp = registerMarkdownOnly(editor);
  const exported = filled(
    () => $importMarkdown(markdown),
    $exportMarkdown,
    editor,
  );
  stopCleanUp();
  return exported;
}

export interface ShownLink {
  text: string;
  url: string;
}

// The links a draft shows, each with its text and where it goes.
export function linksIn(markdown: string): ShownLink[] {
  return filled(
    () => $importMarkdown(markdown),
    () => {
      const links = $getRoot()
        .getAllTextNodes()
        .map((text) => text.getParent())
        .filter($isLinkNode);
      return [...new Set(links)].map((link) => ({
        text: link.getTextContent(),
        url: link.getURL(),
      }));
    },
  );
}

// Typed text that a shortcut did not turn into a block stays a plain paragraph.
export function typedParagraph(text: string): string {
  return filled(
    () =>
      $getRoot().append($createParagraphNode().append($createTextNode(text))),
    $exportMarkdown,
  );
}

const textFormats: TextFormatType[] = [
  'bold',
  'italic',
  'strikethrough',
  'code',
  'underline',
  'highlight',
  'subscript',
  'superscript',
  'lowercase',
  'uppercase',
  'capitalize',
];

// Lexical's HTML import into an empty paragraph, as a rich-text paste inserts it.
function $insertHtml(editor: LexicalEditor, document: Document): void {
  const paragraph = $createParagraphNode();
  $getRoot().clear().append(paragraph);
  paragraph.select();
  $insertNodes($generateNodesFromDOM(editor, document));
}

/*
 * The marks on each text node after HTML is imported into the editor with the web drawing's clean-up
 * registered. happy-dom parses the HTML, since the test runs without a browser.
 */
export function marksAfterPasting(html: string): TextFormatType[][] {
  const editor = headlessEditor();
  const stopCleanUp = registerMarkdownOnly(editor);
  withDOM((window) => {
    const document = new window.DOMParser().parseFromString(html, 'text/html');
    editor.update(() => $insertHtml(editor, document), { discrete: true });
  });
  stopCleanUp();
  return editor.getEditorState().read(() =>
    $getRoot()
      .getAllTextNodes()
      .map((text) => textFormats.filter((format) => text.hasFormat(format))),
  );
}
