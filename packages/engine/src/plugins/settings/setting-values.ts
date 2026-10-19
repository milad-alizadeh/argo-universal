import type {
  PluginSettingField,
  PluginSettingValue,
} from '@repo/contracts/plugins';

// How a stored `contributes.settings` value is checked against its field and read with the field's default.
type Stored = Record<string, PluginSettingValue>;

type PlainField = Exclude<PluginSettingField, { type: 'secret' }>;

// A toggle with no default is off; a text or picker with none is unset.
const defaultOf = (field: PlainField): PluginSettingValue | undefined =>
  field.type === 'toggle' ? (field.default ?? false) : field.default;

// A key such as `constructor` must not read the object's prototype.
const ownValue = (
  stored: Stored,
  key: string,
): PluginSettingValue | undefined =>
  Object.hasOwn(stored, key) ? stored[key] : undefined;

// A stored value the field no longer takes, after a Plugin update changes its type or options, falls back to the default.
const storedValue = (
  field: PlainField,
  stored: Stored,
): PluginSettingValue | undefined => {
  const value = ownValue(stored, field.key);

  return value !== undefined && takes(field, value) ? value : undefined;
};

export const valueOf = (
  field: PlainField,
  stored: Stored,
): PluginSettingValue | undefined =>
  storedValue(field, stored) ?? defaultOf(field);

// A secret's value never leaves the Server, so the App gets only whether it is set.
export function storedEntry(
  field: PluginSettingField,
  stored: Stored,
): [string, PluginSettingValue][] {
  if (field.type === 'secret') return [];

  const value = valueOf(field, stored);

  return value === undefined ? [] : [[field.key, value]];
}

export function check(
  field: PluginSettingField,
  value: PluginSettingValue,
): void {
  if (field.type === 'toggle') return checkToggle(field.key, value);

  checkText(field, value);
}

function takes(field: PluginSettingField, value: PluginSettingValue): boolean {
  try {
    check(field, value);

    return true;
  } catch {
    return false;
  }
}

function checkToggle(key: string, value: PluginSettingValue): void {
  if (typeof value !== 'boolean') throw new Error(`${key} takes on or off`);
}

function checkText(field: PluginSettingField, value: PluginSettingValue): void {
  if (typeof value !== 'string') throw new Error(`${field.key} takes text`);

  if (field.type === 'picker') checkOption(field, value);
}

function checkOption(
  field: Extract<PluginSettingField, { type: 'picker' }>,
  value: string,
): void {
  if (!field.options.some((option) => option.value === value))
    throw new Error(`${value} is not an option of ${field.key}`);
}
