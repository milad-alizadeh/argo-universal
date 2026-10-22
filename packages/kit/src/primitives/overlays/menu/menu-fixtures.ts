export const choices = [
  { value: 'default', label: 'Option one' },
  { value: 'ask', label: 'Option two' },
  { value: 'full', label: 'Option three' },
] as const;

export type Permission = (typeof choices)[number]['value'];

// The chosen value is state the example holds, so a fixture leaves it out.
export type MenuFixture = { disabled?: boolean };

export const disabledMenu = { disabled: true } satisfies MenuFixture;
