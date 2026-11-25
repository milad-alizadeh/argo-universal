const firstInspectorVersion = 26;

export function usesIPadSplitView(
  platform: string,
  isPad: boolean,
  version: number | string,
): boolean {
  return (
    platform === 'ios' &&
    isPad &&
    Number.parseInt(String(version), 10) >= firstInspectorVersion
  );
}

export function splitSectionHref<Href>(
  current: string,
  next: string,
  {
    choices,
    lastPages,
  }: {
    choices: readonly { id: string; href: Href }[];
    lastPages?: ReadonlyMap<string, Href>;
  },
): Href | undefined {
  if (current === next) return undefined;

  const choice = choices.find(({ id }) => id === next);

  return choice && (lastPages?.get(next) ?? choice.href);
}
