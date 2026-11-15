import type { Page, Locator } from '@playwright/test';

export async function dragPromptUp(page: Page, row: Locator): Promise<void> {
  const rows = page.getByTestId('queued-prompt-row');
  const source = await row.getByTestId('queue-reorder-grip').boundingBox();

  const position = await row.evaluate(
    (element) => element.getBoundingClientRect().top,
  );

  const previous = await precedingRowTop(rows, position);

  if (!source || previous === undefined)
    throw new Error('Expected a preceding Queued Prompt');

  await dragGrip(page, source, previous);
}

async function dragGrip(
  page: Page,
  source: { x: number; y: number; width: number; height: number },
  targetY: number,
): Promise<void> {
  const x = source.x + source.width / 2;
  const y = source.y + source.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 8, { steps: 2 });
  await page.mouse.move(x, targetY + 2, { steps: 12 });
  await page.mouse.up();
}

async function precedingRowTop(
  rows: Locator,
  top: number,
): Promise<number | undefined> {
  return rows.evaluateAll(
    (elements, position) =>
      elements
        .map((element) => element.getBoundingClientRect())
        .reverse()
        .find((box) => box.top < position)?.top,
    top,
  );
}
