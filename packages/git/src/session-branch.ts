const sessionBranchPrefix = 'argo/';

const adjectives = [
  'amber',
  'brave',
  'calm',
  'clever',
  'crisp',
  'eager',
  'gentle',
  'golden',
  'happy',
  'jolly',
  'keen',
  'lively',
  'mellow',
  'nimble',
  'proud',
  'quiet',
  'rapid',
  'silver',
  'steady',
  'sunny',
  'swift',
  'tidy',
  'vivid',
  'witty',
];

const nouns = [
  'badger',
  'beacon',
  'canyon',
  'comet',
  'falcon',
  'forest',
  'harbor',
  'island',
  'lagoon',
  'lantern',
  'meadow',
  'otter',
  'panda',
  'pebble',
  'quartz',
  'river',
  'sparrow',
  'summit',
  'thicket',
  'tundra',
  'valley',
  'willow',
  'walrus',
  'zephyr',
];

const fnvPrime = 16_777_619;

const tailLength = 6;

const base36 = 36;

// FNV-1a, so the same id always names the same worktree.
const hash = (text: string): number => {
  let value = 2_166_136_261;

  for (const char of text)
    value = Math.imul(value ^ char.charCodeAt(0), fnvPrime) >>> 0;

  return value;
};

// A readable name made from the Session id alone, so it needs no stored data. The id's tail keeps it unique.
export const worktreeName = (id: string): string => {
  const seed = hash(id);

  // An id with no letters or digits still gets a suffix, from the hash.
  const tail =
    id
      .replaceAll(/[^a-zA-Z0-9]/g, '')
      .slice(-tailLength)
      .toLowerCase() || seed.toString(base36).slice(0, tailLength);

  return [
    adjectives[seed % adjectives.length],
    nouns[Math.floor(seed / adjectives.length) % nouns.length],
    tail,
  ].join('-');
};

// The prefix is stored data and must survive a product rename.
const prefixed = (name: string): string => `${sessionBranchPrefix}${name}`;

export const sessionBranch = (id: string): string => prefixed(worktreeName(id));

// A worktree made before it had a readable name is on `argo/<id>`.
export const isSessionBranch = (branch: string | null, id: string): boolean =>
  branch === sessionBranch(id) || branch === prefixed(id);

// The name of the worktree a Session branch was made for, or null for any other branch.
export const sessionBranchOwner = (branch: string | null): string | null =>
  branch?.startsWith(sessionBranchPrefix)
    ? branch.slice(sessionBranchPrefix.length)
    : null;
