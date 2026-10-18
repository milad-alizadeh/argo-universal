export async function fetchText(): Promise<never> {
  throw new Error('The Server SVG parser does not fetch URLs');
}
