export const renderFallbackLine = (
  pluginId: string,
  slotId: string,
  reason: string,
): string =>
  `Plugin ${pluginId}: core fallback ${slotId}: ${reason.replaceAll(/[\r\n]/g, ' ')}`;

export function oncePerRenderFallback(
  log: (line: string) => void,
): (line: string) => void {
  const seen = new Set<string>();

  return (line) => {
    if (line.includes(': core fallback ')) {
      if (seen.has(line)) return;
      seen.add(line);
    }

    log(line);
  };
}
