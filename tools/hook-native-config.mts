// after-edit's oxlint config: the repository's, less its JS plugins, which take over a second to load on every edit (docs/agents/hooks.md).
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { parseJson, root } from './hook-checks.mts';

const rulesSchema = z.record(z.string(), z.json());

const objectSchema = z.record(z.string(), z.json());

const configSchema = z.looseObject({
  extends: z.array(z.string()).optional(),
  plugins: z.array(z.string()).optional(),
  categories: objectSchema.optional(),
  env: objectSchema.optional(),
  settings: objectSchema.optional(),
  options: objectSchema.optional(),
  ignorePatterns: z.array(z.string()).optional(),
  rules: rulesSchema.optional(),
  overrides: z
    .array(
      z.looseObject({
        files: z.array(z.string()),
        rules: rulesSchema.optional(),
      }),
    )
    .optional(),
});

type OxlintConfig = z.infer<typeof configSchema>;

type Rules = z.infer<typeof rulesSchema>;

// oxlint's own plugins; any other rule prefix names a JS plugin.
const NATIVE_PLUGINS = new Set([
  'eslint',
  'typescript',
  'unicorn',
  'react',
  'react-perf',
  'nextjs',
  'oxc',
  'import',
  'jsdoc',
  'jsx-a11y',
  'node',
  'promise',
  'jest',
  'vitest',
  'vue',
]);

const top = path.join(root, '.oxlintrc.json');

// Beside the config it copies, because oxlint reads override globs from the config's folder; .gitignore lists it.
export const nativeConfigPath = path.join(root, '.oxlintrc.native.json');

// The configs are JSONC with whole-line comments only, which oxfmt keeps that way.
function readConfig(file: string): OxlintConfig {
  const text = readFileSync(file, 'utf8')
    .split('\n')
    .filter((line): boolean => !line.trimStart().startsWith('//'))
    .join('\n');

  const parsed = parseJson(configSchema, text);

  if (!parsed.success) throw new Error(`${file} is not an oxlint config`);

  return parsed.data;
}

const isNative = (rule: string): boolean =>
  !rule.includes('/') || NATIVE_PLUGINS.has(rule.split('/')[0] ?? '');

const nativeRules = (rules: Rules = {}): Rules =>
  Object.fromEntries(Object.entries(rules).filter(([rule]) => isNative(rule)));

const assign = (objects: (Rules | undefined)[]): Rules =>
  Object.assign({}, ...objects);

function merge(parts: OxlintConfig[]): OxlintConfig {
  return {
    // No list keeps oxlint's default plugins, as the repository's config would.
    plugins: parts.some((part) => part.plugins)
      ? [...new Set(parts.flatMap((part) => part.plugins ?? []))]
      : undefined,
    categories: assign(parts.map((part) => part.categories)),
    env: assign(parts.map((part) => part.env)),
    settings: assign(parts.map((part) => part.settings)),
    options: parts[0]?.options,
    ignorePatterns: parts.flatMap((part) => part.ignorePatterns ?? []),
    rules: assign(parts.map((part) => nativeRules(part.rules))),
    overrides: parts.flatMap((part) =>
      (part.overrides ?? []).map((override) => ({
        ...override,
        rules: nativeRules(override.rules),
      })),
    ),
  };
}

const modified = (file: string): number => {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return 0;
  }
};

// Rebuilt only when the repository's config or a file it extends changed since.
export function nativeConfig(): string {
  const config = readConfig(top);
  const files = (config.extends ?? []).map((part) => path.join(root, part));
  const newest = Math.max(...[top, ...files].map(modified));

  if (modified(nativeConfigPath) > newest) return nativeConfigPath;

  writeFileSync(
    nativeConfigPath,
    JSON.stringify(merge([config, ...files.map(readConfig)])),
  );

  return nativeConfigPath;
}
