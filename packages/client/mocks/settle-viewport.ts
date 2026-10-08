export async function settleViewport(width: number): Promise<void> {
  const { page } = await import('vitest/browser');
  await page.viewport(width, 844);
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
