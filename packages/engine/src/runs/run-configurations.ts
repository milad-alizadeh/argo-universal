import {
  findNodeAtLocation,
  getNodeValue,
  parseTree,
  printParseErrorCode,
  type Node,
  type ParseError,
} from 'jsonc-parser';
import { z } from 'zod';

// Where a Project checks in its Run Configurations, relative to the Checkout.
export const runConfigurationsFile = '.argo/run.json';

export const validReadyPattern = (source: string): boolean => {
  try {
    new RegExp(source, 'u');

    return true;
  } catch {
    return false;
  }
};

const highestPort = 65_535;

const Ready = z.union([
  z.strictObject({
    pattern: z.string().refine(validReadyPattern, 'not a regular expression'),
  }),
  z.strictObject({ port: z.literal(true) }),
]);

const RunConfiguration = z.strictObject({
  name: z.string().min(1).describe('A unique Run Configuration name.'),
  command: z.string().min(1).describe('The shell command that starts the Run.'),
  cwd: z
    .string()
    .min(1)
    .default('.')
    .describe('The working folder. Relative paths start at the Checkout root.'),
  env: z
    .record(z.string(), z.string())
    .default({})
    .describe(
      'Shared environment values. Keep secrets in personal Project settings.',
    ),
  port: z
    .int()
    .min(1)
    .max(highestPort)
    .optional()
    .describe('A fixed port. Omit it to let Argo allocate one and set $PORT.'),
  url: z
    .string()
    .min(1)
    .optional()
    .describe('The app URL, which can include $PORT.'),
  ready: Ready.optional().describe(
    'Wait for an output regular expression or for the port to listen. By default, wait for the port.',
  ),
});

export type RunConfiguration = z.infer<typeof RunConfiguration>;

const RunGroup = z.strictObject({
  members: z
    .array(z.string())
    .describe('Names of Run Configurations to start together.'),
  stopAll: z
    .boolean()
    .optional()
    .describe('Also stop the other group members when one member is stopped.'),
});

export type RunGroup = z.infer<typeof RunGroup>;

const RunConfigurationsFile = z
  .strictObject({
    configurations: z.array(RunConfiguration).default([]),
    groups: z
      .record(z.string(), RunGroup)
      .default({})
      .describe('Named groups whose members refer to Run Configuration names.'),
    default: z
      .string()
      .optional()
      .describe('The name of a group to show in the Workbench.'),
  })
  .superRefine((file, context) => {
    const names = new Set<string>();

    for (const [index, { name }] of file.configurations.entries()) {
      if (names.has(name))
        context.addIssue({
          code: 'custom',
          path: ['configurations', index, 'name'],
          message: `another Run Configuration is already named "${name}"`,
        });
      names.add(name);
    }

    for (const [group, { members }] of Object.entries(file.groups))
      for (const [index, member] of members.entries())
        if (!names.has(member))
          context.addIssue({
            code: 'custom',
            path: ['groups', group, 'members', index],
            message: `"${member}" is not a Run Configuration`,
          });

    if (file.default !== undefined && !Object.hasOwn(file.groups, file.default))
      context.addIssue({
        code: 'custom',
        path: ['default'],
        message: `"${file.default}" is not a group`,
      });
  });

export type RunConfigurations = z.infer<typeof RunConfigurationsFile>;

export function runConfigurationSchema(): z.core.JSONSchema.JSONSchema {
  return z.toJSONSchema(RunConfigurationsFile, {
    io: 'input',
    target: 'draft-7',
  });
}

type RunConfigurationsError = {
  message: string;
  line: number;
  column: number;
};

export type RunConfigurationsRead =
  | ({ ok: true } & RunConfigurations)
  | { ok: false; error: RunConfigurationsError };

const locate = (
  source: string,
  offset: number,
): Pick<RunConfigurationsError, 'line' | 'column'> => {
  const before = source.slice(0, offset).split('\n');

  return { line: before.length, column: (before.at(-1)?.length ?? 0) + 1 };
};

const failure = (
  source: string,
  offset: number,
  reason: string,
): RunConfigurationsRead => {
  const where = locate(source, offset);

  return {
    ok: false,
    error: {
      ...where,
      message: `${runConfigurationsFile}:${where.line}:${where.column}: ${reason}`,
    },
  };
};

const issueOffset = (tree: Node, path: readonly PropertyKey[]): number => {
  const location = path.filter(
    (part): part is string | number => typeof part !== 'symbol',
  );

  // A missing field has no place of its own, so the object that lacks it is where to look.
  for (let length = location.length; length >= 0; length -= 1) {
    const node = findNodeAtLocation(tree, location.slice(0, length));

    if (node) return node.offset;
  }

  return tree.offset;
};

const issueReason = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.join('.');

  const where = path || 'file';

  if (issue.code === 'unrecognized_keys') {
    const keys = issue.keys.map((key) => `"${key}"`).join(', ');

    return `${where}: unknown ${issue.keys.length > 1 ? 'fields' : 'field'} ${keys}`;
  }

  return `${where}: ${issue.message}`;
};

// Reads the file's contents, and never turns a bad file into an empty list: it says where the file is wrong.
export function readRunConfigurations(source: string): RunConfigurationsRead {
  const errors: ParseError[] = [];

  const tree = parseTree(source, errors, {
    allowTrailingComma: true,
    allowEmptyContent: false,
  });

  const [syntax] = errors;

  if (syntax)
    return failure(source, syntax.offset, printParseErrorCode(syntax.error));

  if (!tree) return failure(source, 0, 'the file is empty');

  const parsed = RunConfigurationsFile.safeParse(getNodeValue(tree));

  if (parsed.success) return { ok: true, ...parsed.data };

  const [issue] = parsed.error.issues;

  if (!issue) return failure(source, 0, 'the file is not valid');

  return failure(source, issueOffset(tree, issue.path), issueReason(issue));
}
