// The pills of one toolbar row; the story's row owns which is selected.
export const filtersFilterPill = [
  { value: 'all', label: 'All' },
  { value: 'installed', label: 'Installed', count: 4 },
  { value: 'not-installed', label: 'Not installed', count: 2 },
] as const;
