const conditions = [
  'default',
  'import',
  'react-native',
  'browser',
  'node',
  'types',
];

function conditionTarget(value) {
  if (!value) return;
  if (typeof value !== 'object') return;
  return pickTarget(selectedCondition(value));
}

export function pickTarget(value) {
  if (typeof value === 'string') return value;
  return Array.isArray(value) ? pickTarget(value[0]) : conditionTarget(value);
}

export function wildcardMatch(pattern, key) {
  const [prefix, suffix] = pattern.split('*');
  if (suffix === undefined) return;
  if (!key.startsWith(prefix)) return;
  return wildcardMiddle(prefix, suffix, key);
}

function wildcardMiddle(prefix, suffix, key) {
  if (!key.endsWith(suffix)) return;
  if (key.length < prefix.length + suffix.length) return;
  return key.slice(prefix.length, key.length - suffix.length);
}

function wildcardTarget(pattern, value, key) {
  const middle = wildcardMatch(pattern, key);
  if (middle === undefined) return;
  return pickTarget(value)?.replace('*', middle);
}

function isConditions(map) {
  return [
    typeof map === 'string',
    Array.isArray(map),
    !Object.keys(map).some((key) => /^[.#]/.test(key)),
  ].some(Boolean);
}

function mappedTarget(map, key) {
  if (key in map) return pickTarget(map[key]);
  return Object.entries(map)
    .map(([pattern, value]) => wildcardTarget(pattern, value, key))
    .find(Boolean);
}

export function matchMap(map, key) {
  if (!map) return;
  return isConditions(map) ? rootTarget(map, key) : mappedTarget(map, key);
}

function selectedCondition(value) {
  const condition = conditions.find((key) => key in value);
  return value[condition] ?? Object.values(value)[0];
}

function rootTarget(map, key) {
  return key === '.' ? pickTarget(map) : undefined;
}
