import type {
  ChangedFile,
  ChangesSummary,
  SessionChangesOutput,
  SessionDiffOutput,
} from '@repo/contracts';

export interface ChangesMock {
  summary: ChangesSummary;
  files: SessionChangesOutput;
  diffs: Record<string, SessionDiffOutput>;
}

// Unprefixed lines are context; `+` and `-` lines are added and removed.
interface Hunk {
  oldStart: number;
  newStart: number;
  lines: string[];
}

interface Change {
  operation: ChangedFile['operation'];
  path: string;
  oldPath?: string;
  hunks?: Hunk[];
  binary?: true;
}

const count = (hunks: Hunk[], sign: string) =>
  hunks.flatMap((hunk) => hunk.lines).filter((line) => line.startsWith(sign))
    .length;

const hunkText = ({ oldStart, newStart, lines }: Hunk) => {
  const oldLines = lines.filter((line) => !line.startsWith('+')).length;
  const newLines = lines.filter((line) => !line.startsWith('-')).length;
  const body = lines.map((line) =>
    line.startsWith('+') || line.startsWith('-') ? line : ` ${line}`,
  );
  return [
    `@@ -${oldLines === 0 ? 0 : oldStart},${oldLines} +${newLines === 0 ? 0 : newStart},${newLines} @@`,
    ...body,
  ];
};

// Prints a change as `git diff` does, with the same headers for each operation.
function toPatch(change: Change): string {
  const oldPath = change.oldPath ?? change.path;
  const header = [`diff --git a/${oldPath} b/${change.path}`];
  const operationHeader = {
    add: ['new file mode 100644', 'index 0000000..8f3b2a1'],
    delete: ['deleted file mode 100644', 'index 4c1e9d7..0000000'],
    modify: ['index 4c1e9d7..8f3b2a1 100644'],
    move: [
      'similarity index 91%',
      `rename from ${oldPath}`,
      `rename to ${change.path}`,
      'index 4c1e9d7..8f3b2a1 100644',
    ],
  };
  header.push(...operationHeader[change.operation]);
  const from = change.operation === 'add' ? '/dev/null' : `a/${oldPath}`;
  const to = change.operation === 'delete' ? '/dev/null' : `b/${change.path}`;
  if (change.binary)
    return [...header, `Binary files ${from} and ${to} differ`, ''].join('\n');
  return [
    ...header,
    `--- ${from}`,
    `+++ ${to}`,
    ...(change.hunks ?? []).flatMap(hunkText),
    '',
  ].join('\n');
}

function toChangesMock(changes: Change[]): ChangesMock {
  const diffs: ChangesMock['diffs'] = {};
  const files = changes.map((change): ChangedFile => {
    const hunks = change.hunks ?? [];
    const file: ChangedFile = {
      operation: change.operation,
      path: change.path,
      ...(change.oldPath ? { oldPath: change.oldPath } : {}),
      additions: change.binary ? null : count(hunks, '+'),
      deletions: change.binary ? null : count(hunks, '-'),
    };
    diffs[change.path] = {
      file,
      patch: { format: 'git_patch', text: toPatch(change) },
    };
    return file;
  });
  return {
    summary: {
      files: files.length,
      additions: files.reduce((sum, file) => sum + (file.additions ?? 0), 0),
      deletions: files.reduce((sum, file) => sum + (file.deletions ?? 0), 0),
    },
    files,
    diffs,
  };
}

const range = (length: number, line: (index: number) => string) =>
  Array.from({ length }, (_, index) => line(index + 1));

const fewFiles: Change[] = [
  {
    operation: 'modify',
    path: 'src/sessions/session-row.tsx',
    hunks: [
      {
        oldStart: 12,
        newStart: 12,
        lines: [
          'export function SessionRow({ session }: SessionRowProps) {',
          '  const title = session.title.trim();',
          '-  return <Row title={title} />;',
          '+  const changes = session.changes;',
          '+  return <Row title={title} changes={changes} />;',
          '}',
        ],
      },
    ],
  },
  {
    operation: 'add',
    path: 'src/sessions/changes-chip.tsx',
    hunks: [
      {
        oldStart: 0,
        newStart: 1,
        lines: [
          "+import type { ChangesSummary } from '@repo/contracts';",
          '+',
          '+export function ChangesChip({ changes }: { changes: ChangesSummary }) {',
          '+  return <Chip count={changes.files} />;',
          '+}',
        ],
      },
    ],
  },
  {
    operation: 'delete',
    path: 'src/sessions/legacy-badge.tsx',
    hunks: [
      {
        oldStart: 1,
        newStart: 0,
        lines: ['-export function LegacyBadge() {', '-  return null;', '-}'],
      },
    ],
  },
  {
    operation: 'move',
    oldPath: 'src/feed/diff.ts',
    path: 'src/feed/file-diff.ts',
    hunks: [
      {
        oldStart: 4,
        newStart: 4,
        lines: [
          'export interface FileDiff {',
          '  path: string;',
          '-  hunks: string[];',
          '+  hunks: DiffHunk[];',
          '}',
        ],
      },
    ],
  },
];

const manyFiles: Change[] = range(60, (index) => String(index)).map(
  (index) => ({
    operation: 'modify',
    path: `packages/feature-${index.padStart(2, '0')}/src/index.ts`,
    hunks: [
      {
        oldStart: 1,
        newStart: 1,
        lines: [
          "-export const name = 'feature';",
          `+export const name = 'feature-${index}';`,
          ...(Number(index) % 3 === 0
            ? [`+export const order = ${index};`]
            : []),
          'export default name;',
        ],
      },
    ],
  }),
);

const largeDiff: Change[] = [
  {
    operation: 'modify',
    path: 'src/generated/schema.ts',
    hunks: [
      {
        oldStart: 1,
        newStart: 1,
        lines: [
          "import { z } from 'zod';",
          '',
          ...range(1000, (line) => `-  field${line}: z.string(),`),
          ...range(1200, (line) => `+  field${line}: z.string().min(1),`),
        ],
      },
    ],
  },
  ...fewFiles.slice(0, 1),
];

const binaryFile: Change[] = [
  { operation: 'modify', path: 'assets/logo.png', binary: true },
  { operation: 'add', path: 'assets/splash.png', binary: true },
  {
    operation: 'modify',
    path: 'README.md',
    hunks: [
      {
        oldStart: 1,
        newStart: 1,
        lines: [
          '# Example',
          '-![Logo](assets/logo.svg)',
          '+![Logo](assets/logo.png)',
        ],
      },
    ],
  },
];

// `session.changes`, `session.diff` and the snapshot summary for one Checkout each.
export const changesMocks = {
  none: toChangesMock([]),
  fewFiles: toChangesMock(fewFiles),
  manyFiles: toChangesMock(manyFiles),
  largeDiff: toChangesMock(largeDiff),
  binaryFile: toChangesMock(binaryFile),
} satisfies Record<string, ChangesMock>;
