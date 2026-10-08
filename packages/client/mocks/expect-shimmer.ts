import { expect, waitFor } from 'storybook/test';

export async function expectShimmerMovement(
  row: HTMLElement,
  suffix?: string,
): Promise<void> {
  let characters = Array.from(row.querySelectorAll('span')).filter(
    (element) => element.textContent?.length === 1,
  );
  if (suffix) {
    characters = characters.slice(-suffix.length);
    await expect(
      characters.map((element) => element.textContent).join(''),
    ).toBe(suffix);
  }
  await expect(characters.length).toBeGreaterThan(1);
  const opacities = (): string =>
    characters.map((element) => getComputedStyle(element).opacity).join(',');
  const before = opacities();
  await waitFor(() => expect(opacities()).not.toBe(before), { timeout: 2500 });
}
