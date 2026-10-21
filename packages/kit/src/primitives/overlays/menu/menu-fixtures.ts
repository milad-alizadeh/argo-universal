import type { ChoiceMenuProps } from './menu-props';

export const choices = [
  { value: 'default', label: 'Option one' },
  { value: 'ask', label: 'Option two' },
  { value: 'full', label: 'Option three' },
] as const;

export type Permission = (typeof choices)[number]['value'];

const limitedChoices = choices.map((choice) => ({
  ...choice,
  disabled: choice.value === 'full',
}));

// The chosen value is state the example holds, so a fixture leaves it out.
export type MenuFixture = {
  disabled?: boolean;
  loading?: boolean;
  options?: ChoiceMenuProps<Permission>['options'];
};

export const disabledMenu = { disabled: true } satisfies MenuFixture;

export const disabledOptionMenu = {
  options: limitedChoices,
} satisfies MenuFixture;

export const loadingMenu = { loading: true } satisfies MenuFixture;
