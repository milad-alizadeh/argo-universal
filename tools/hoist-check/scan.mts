import fs from 'node:fs';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { parse } from 'jsonc-parser';

export const sourceExtensions = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
];
const skippedDirectories = new Set([
  'node_modules',
  '.git',
  'dist',
  '.expo',
  '.turbo',
  '.vitest',
  'coverage',
  'storybook-static',
  'playwright-report',
  'blob-report',
  'test-results',
  'android',
  'ios',
  '.claude',
  '.agents',
  'drizzle',
  '.rnstorybook',
  'docs',
  '.features-gen',
]);
export function readJson(file: string): unknown {
  try {
    return parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return;
  }
}

function sourceFile(file: string): boolean {
  return sourceExtensions.includes(path.extname(file)) && !/\.gen\./.test(file);
}

function walkEntry(directory: string, entry: Dirent): string[] {
  if (skippedDirectories.has(entry.name)) return [];
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : sourceFiles(full);
}

function sourceFiles(file: string): string[] {
  return sourceFile(file) ? [file] : [];
}

export function walk(directory: string): string[] {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry): string[] => walkEntry(directory, entry));
}

const testAssetPatterns = [
  /\.(?:test|spec|stories|mocks)\.[^/]+$/,
  /(?:^|\/)mocks\//,
  /^(?:e2e|tools|apps\/storybook)\//,
  /(?:^|\/)[^/]*\.config\.[^/]+$/,
  /(?:^|\/)vitest\.setup\.[^/]+$/,
];
export function isTestAsset(file: string): boolean {
  return testAssetPatterns.some((pattern): boolean => pattern.test(file));
}

export function relative(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}
