import fs from 'node:fs';
import path from 'node:path';
import { tokens } from './tokens.mjs';

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
export function stripComments(text) {
  return [...tokens(text)].join(' ');
}

export function readJson(file) {
  try {
    return JSON.parse(
      stripComments(fs.readFileSync(file, 'utf8')).replaceAll(
        /,(\s*[}\]])/g,
        '$1',
      ),
    );
  } catch {
    return;
  }
}

function sourceFile(file) {
  return sourceExtensions.includes(path.extname(file)) && !/\.gen\./.test(file);
}

function walkEntry(directory, entry) {
  if (skippedDirectories.has(entry.name)) return [];
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : sourceFiles(full);
}

function sourceFiles(file) {
  return sourceFile(file) ? [file] : [];
}

export function walk(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => walkEntry(directory, entry));
}

const testAssetPatterns = [
  /\.(?:test|spec|stories|mocks)\.[^/]+$/,
  /(?:^|\/)mocks\//,
  /^(?:e2e|tools|apps\/storybook)\//,
  /(?:^|\/)[^/]*\.config\.[^/]+$/,
  /(?:^|\/)vitest\.setup\.[^/]+$/,
];
export function isTestAsset(file) {
  return testAssetPatterns.some((pattern) => pattern.test(file));
}

export function relative(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}
