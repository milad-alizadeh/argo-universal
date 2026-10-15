import { pageTitle, type SheetStack } from './sheet-pages';

// Back names the page it returns to.
export function backLabel(stack: Pick<SheetStack, 'pages' | 'path'>): string {
  const title = pageTitle(stack.pages, pageBelow(stack));

  return title ? `Back to ${title}` : 'Back';
}

function pageBelow(
  stack: Pick<SheetStack, 'pages' | 'path'>,
): string | undefined {
  return stack.path.at(-2) ?? stack.pages[0]?.name;
}
