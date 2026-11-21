// "list-header" is drawn as "Drawing · List header".
export function regionLabel(region: string): string {
  const words = region.replaceAll(/[-_]+/g, ' ').trim();

  return `Drawing · ${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}
