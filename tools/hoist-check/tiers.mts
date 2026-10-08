type Tier = { tier: 'generic' | 'local' | 'product' | 'none'; label: string };
const tierRules: [RegExp, Tier['tier'], string][] = [
  [/^packages\/client\/src\/lib\//, 'generic', 'client lib'],
  [/^packages\/client\/src\/primitives\//, 'generic', 'client primitives'],
  [
    /^packages\/client\/src\/(?:screens|components)\//,
    'local',
    'client screens or components',
  ],
  [/^apps\/server\/src\/lib\//, 'generic', 'Server lib'],
  [
    /^apps\/server\/src\/services\/[^/]+\/index\.ts$/,
    'product',
    'Server domain face',
  ],
  [/^apps\//, 'local', 'app'],
  [/^packages\/agents\/(?!src\/)[^/]+\//, 'local', 'Agent adapter'],
  [
    /^(?:packages\/machine-log|packages\/uniwind|tooling)\//,
    'generic',
    'generic package',
  ],
  [/^packages\//, 'product', 'product package'],
];

export function tierOf(file: string): Tier {
  const rule = tierRules.find(([pattern]): boolean => pattern.test(file));
  return rule
    ? { tier: rule[1], label: rule[2] }
    : { tier: 'none', label: 'outside the tiers' };
}

export function shortList(consumers: Set<string>): string {
  return (
    [...consumers]
      .sort((a, b): number => a.localeCompare(b))
      .slice(0, 4)
      .join(', ') + (consumers.size > 4 ? `, +${consumers.size - 4}` : '')
  );
}

export function verdict(count: number): string {
  return (
    [
      'NO production consumer',
      'ONE consumer: default to local',
      'TWO consumers: wait for the third',
    ][count] ?? 'earned'
  );
}
