interface Keyed {
  key?: string;
}

// Preserve author keys and ordinary positional IDs; escape only positional collisions.
export function childKeys(children: Keyed[]): string[] {
  const authored = new Set(children.map((child) => child.key));

  return children.map(
    (child, index) => child.key ?? positionalKey(index, authored),
  );
}

function positionalKey(
  index: number,
  authored: Set<string | undefined>,
): string {
  let key = String(index);

  while (authored.has(key)) key = `~${key}`;

  return key;
}
