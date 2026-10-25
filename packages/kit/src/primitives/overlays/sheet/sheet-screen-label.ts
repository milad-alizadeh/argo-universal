import type { SheetScreenEntry, SheetStack } from './sheet-screens';

function screenTitle(
  pages: SheetScreenEntry[],
  name: string | undefined,
): string | undefined {
  return pages.find((page) => page.name === name)?.title;
}

// Back names the page it returns to.
export function backLabel(stack: Pick<SheetStack, 'pages' | 'path'>): string {
  const title = screenTitle(stack.pages, screenBelow(stack));

  return title ? `Back to ${title}` : 'Back';
}

function screenBelow(
  stack: Pick<SheetStack, 'pages' | 'path'>,
): string | undefined {
  return stack.path.at(-2) ?? stack.pages[0]?.name;
}
