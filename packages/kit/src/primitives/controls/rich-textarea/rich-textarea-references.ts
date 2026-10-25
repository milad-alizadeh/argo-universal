// An Issue or pull request the editor can reference as `#123`.
export interface ReferenceOption {
  number: number;
  title: string;
  state: 'open' | 'done';
}

const resultLimit = 8;

function matches(option: ReferenceOption, query: string): boolean {
  const needle = query.toLowerCase();

  return (
    String(option.number).startsWith(needle) ||
    option.title.toLowerCase().includes(needle)
  );
}

function openRank({ state }: ReferenceOption): number {
  return state === 'open' ? 0 : 1;
}

// What `#` followed by `query` offers: matched by number or title, open ones first.
export function matchReferences(
  options: readonly ReferenceOption[],
  query: string,
): ReferenceOption[] {
  return options
    .filter((option) => matches(option, query))
    .sort((a, b) => openRank(a) - openRank(b))
    .slice(0, resultLimit);
}

const shortTitleLength = 24;

// The title a token shows beside its number.
export function shortTitle(title: string): string {
  if (title.length <= shortTitleLength) return title;

  return `${title.slice(0, shortTitleLength).trimEnd()}…`;
}
