import type { WireNode } from './wire';

interface Candidate {
  key: string;
  position: number;
  previous?: Candidate | undefined;
}

function lowerBound(tails: Candidate[], position: number): number {
  let low = 0;
  let high = tails.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);

    if (positionAt(tails, mid) < position) low = mid + 1;
    else high = mid;
  }

  return low;
}

function retain(tails: Candidate[], candidate: Candidate): void {
  const index = lowerBound(tails, candidate.position);
  tails[index] = { ...candidate, previous: tails[index - 1] };
}

function keysOf(last: Candidate | undefined): Set<string> {
  const keys = new Set<string>();

  for (let candidate = last; candidate; candidate = candidate.previous)
    keys.add(candidate.key);

  return keys;
}

// The longest increasing subsequence stays put: one row moved either way needs one move op.
export function retainedKeys(
  before: WireNode[],
  after: WireNode[],
): Set<string> {
  const positions = new Map(before.map((node, index) => [node.key, index]));
  const tails: Candidate[] = [];

  for (const node of after) {
    const position = positions.get(node.key);

    if (position !== undefined) retain(tails, { key: node.key, position });
  }

  return keysOf(tails.at(-1));
}

const positionAt = (tails: Candidate[], index: number): number =>
  tails[index]?.position ?? -1;
