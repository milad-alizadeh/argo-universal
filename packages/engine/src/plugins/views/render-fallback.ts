export const renderFallbackLine = (
  pluginId: string,
  slotId: string,
  reason: string,
): string =>
  `Plugin ${pluginId}: core fallback ${slotId}: ${reason.replaceAll(/[\r\n]/g, ' ')}`;

export const belowWireMinimum = 'App is below the wire minimum';

// Logged once when an App older than the wire minimum opens a page or ordinary Slot (ADR-0034).
export const updateArgoLine = (pluginId: string, path: string): string =>
  `Plugin ${pluginId}: Update Argo ${path}: ${belowWireMinimum}`;

const onceLines = [': core fallback ', ': Update Argo '];

export function oncePerRenderFallback(
  log: (line: string) => void,
): (line: string) => void {
  const seen = new Set<string>();

  return (line) => {
    if (onceLines.some((marker) => line.includes(marker))) {
      if (seen.has(line)) return;
      seen.add(line);
    }

    log(line);
  };
}
