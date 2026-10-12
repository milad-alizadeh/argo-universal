import { createHeadlessEditor } from '@lexical/headless';
import { $isLinkNode } from '@lexical/link';
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';
import {
  $exportMarkdown,
  $importMarkdown,
  richTextareaNodes,
} from '../src/lib/generic/primitives/inputs/rich-textarea/rich-textarea-markdown';

// The editor as the web drawing builds it, without a DOM, filled and then read.
function filled<T>(fill: () => void, read: () => T): T {
  const editor = createHeadlessEditor({
    namespace: 'rich-textarea-test',
    nodes: richTextareaNodes,
    onError: (error) => {
      throw error;
    },
  });
  editor.update(fill, { discrete: true });
  return editor.getEditorState().read(read);
}

// Import a draft, then export what it shows.
export function roundTrip(markdown: string): string {
  return filled(() => $importMarkdown(markdown), $exportMarkdown);
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
