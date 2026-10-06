import { expect, waitFor } from 'storybook/test';

export async function expectShimmerMovement(row: HTMLElement) {
  const characters = Array.from(row.querySelectorAll('span')).filter(
    (element) => element.textContent?.length === 1,
  );
  await expect(characters.length).toBeGreaterThan(1);
  const opacities = () =>
    characters.map((element) => getComputedStyle(element).opacity).join(',');
  const before = opacities();
  await waitFor(() => expect(opacities()).not.toBe(before));
}
