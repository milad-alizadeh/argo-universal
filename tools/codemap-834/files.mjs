import { readFileSync } from 'node:fs';
import { root } from './git.mjs';

const maximumCharacters = 500000;

const branchBands = { high: 20, middle: 9 };

function read(path) {
  try {
    return readFileSync(`${root}/${path}`, 'utf8');
  } catch {
    return;
  }
}

function textFile(text) {
  return !text.includes('\0') && text.length <= maximumCharacters;
}

function content(path) {
  const text = read(path);

  if (text === undefined) return;

  if (textFile(text)) return text;
}

function tone(branches) {
  if (branches >= branchBands.high) return 'danger';

  if (branches >= branchBands.middle) return 'warning';

  return 'border';
}

function branches(text) {
  return (text.match(/\b(if|case|catch|while|for)\b|&&|\|\||\?\?/g) ?? [])
    .length;
}

function entry(path, text, height) {
  const count = branches(text);

  return {
    id: path,
    path,
    area: Math.max(1, text.split('\n').length),
    height,
    branches: count,
    tone: tone(count),
  };
}

export function file(path, commits) {
  const text = content(path);

  if (text === undefined) return;

  return entry(path, text, commits.get(path) ?? 0);
}
