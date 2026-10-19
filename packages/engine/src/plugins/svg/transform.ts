const matrixArgumentCount = 6;

const rotateArgumentCount = 3;

const transformArgumentLengths = new Map<string, readonly number[]>([
  ['matrix', [matrixArgumentCount]],
  ['translate', [1, 2]],
  ['scale', [1, 2]],
  ['rotate', [1, rotateArgumentCount]],
  ['skewX', [1]],
  ['skewY', [1]],
]);

const transformPattern =
  /(matrix|translate|scale|rotate|skewX|skewY)\(([^()]*)\)/g;

export function checkTransform(value: string): void {
  const parsed = parseTransform(value);

  if (!parsed.valid) throw new Error('invalid transform');
}

interface ParsedTransform {
  valid: boolean;
}

function parseTransform(value: string): ParsedTransform {
  const matches = [...value.matchAll(transformPattern)];

  const validCalls = matches.every((match, index) =>
    validCall(value, match, matches[index - 1]),
  );

  const final = matches.at(-1);

  return {
    valid: matches.length > 0 && validCalls && isComplete(value, final),
  };
}

function validCall(
  value: string,
  match: RegExpMatchArray,
  previous: RegExpMatchArray | undefined,
): boolean {
  return validCallContent(value, match, previousEnd(previous));
}

function validCallContent(
  value: string,
  match: RegExpMatchArray,
  previousPosition: number,
): boolean {
  const name = match[1] ?? '';
  const argumentsText = match[2] ?? '';

  return [
    hasWhitespaceOnly(value.slice(previousPosition, match.index)),
    validArguments(name, argumentsText),
  ].every(Boolean);
}

function hasWhitespaceOnly(value: string): boolean {
  return value.trim().length === 0;
}

function previousEnd(previous: RegExpMatchArray | undefined): number {
  if (!previous) return 0;

  return (previous.index ?? 0) + previous[0].length;
}

function isComplete(
  value: string,
  final: RegExpMatchArray | undefined,
): boolean {
  if (!final) return false;

  return value.slice((final.index ?? 0) + final[0].length).trim().length === 0;
}

function validArguments(name: string, argumentsText: string): boolean {
  const values = argumentsText.trim().split(/[\s,]+/);

  const lengths = transformArgumentLengths.get(name);

  return [
    validArgumentValues(values),
    Boolean(lengths?.includes(values.length)),
  ].every(Boolean);
}

function validArgumentValues(values: string[]): boolean {
  return values.every(
    (value) => value.length > 0 && Number.isFinite(Number(value)),
  );
}
