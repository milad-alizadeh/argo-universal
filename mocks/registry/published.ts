import publishedRoot from './published-root.json';

// Minimal real response published by ACP Registry producer 33a1a101ef68ab20a97624ac89d4b977eeac0daf.
export const publishedRegistryResponse = publishedRoot;

export const rejectedExtensions: unknown[] = [
  [{}],
  ['unknown'],
  [null],
  {},
  null,
  false,
  'unknown',
  1,
];

export const rejectedRegistryValues: unknown[] = [
  ...rejectedExtensions.map((extensions) => ({ ...publishedRoot, extensions })),
  { ...publishedRoot, unknown: true },
  {
    ...publishedRoot,
    agents: [{ ...publishedRoot.agents[0], distribution: {} }],
  },
  { ...publishedRoot, agents: [{ ...publishedRoot.agents[0], id: 123 }] },
];
