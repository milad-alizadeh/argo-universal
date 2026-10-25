import { basename, dirname, relative, sep } from 'node:path';
import { CapabilityRefusal } from './capability-refusal';
import {
  inProject,
  inside,
  type Roots,
  type Subject,
} from './plugin-access-rules';

// A write refusal: when it applies, and the reason the Plugin is told about the path it asked for.
type WriteRule = {
  refuses: (target: string, roots: Roots) => boolean;
  reason: (shown: string) => string;
};

// Names git reads as a repository: a `.git` entry, or a `HEAD` file, which makes its folder a bare repository.
const gitNames = new Set(['.git', 'head']);

// The Plugin's SQLite file and its journal siblings; `argo.storage` owns them, the Engine holds them open.
const databaseNames = new Set(['plugin.db', 'plugin.db-wal', 'plugin.db-shm']);

// In order: the first rule that applies is the reason given. Deny beats allow (ADR-0030).
const writeRules: WriteRule[] = [
  {
    refuses: inProject,
    reason: (shown) =>
      `${shown} is in a Project; argo.fs never writes to a Project`,
  },
  {
    refuses: (target, { code }) => code !== null && inside(target, code),
    reason: (shown) => `${shown} is in the Plugin's code folder`,
  },
  {
    refuses: (target, { data }) => !inside(target, data),
    reason: (shown) => `${shown} is outside the Plugin's data folder`,
  },
  {
    refuses: (target, { data }) =>
      dirname(target) === data &&
      databaseNames.has(basename(target).toLowerCase()),
    reason: (shown) =>
      `${shown} is the Plugin's database, which argo.storage owns`,
  },
  {
    // A repository would hand `git`, or `gh` calling it, run with the data folder as its working directory, a config that runs programs.
    refuses: (target, { data }) =>
      relative(data, target)
        .split(sep)
        .some((part) => gitNames.has(part.toLowerCase())),
    reason: (shown) => `${shown} would make a git repository`,
  },
];

export function allowWrite({ target, shown }: Subject, roots: Roots): void {
  const refused = writeRules.find(({ refuses }) => refuses(target, roots));

  if (refused) throw new CapabilityRefusal(refused.reason(shown));
}
