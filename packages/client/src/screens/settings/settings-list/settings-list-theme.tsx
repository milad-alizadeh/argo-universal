import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import { themeChoices } from '#features/settings';
import type { SettingsListViewProps } from './settings-list-props';

type ThemeProps = Pick<SettingsListViewProps, 'theme' | 'onThemeChange'>;

const options = themeChoices.map(({ value, label }) => ({ value, label }));

// Paper's SettingsList: the Theme group's one row, Appearance, opens no page; its Picker chooses the theme in place.
export const themeSection = (props: ThemeProps): ReactElement => (
  <FieldGroup.Section title="Theme">{appearanceRow(props)}</FieldGroup.Section>
);

const appearanceRow = (props: ThemeProps): ReactElement => (
  <FieldGroup.Picker
    title="Appearance"
    leading="appearance"
    presentation="menu"
    value={props.theme ?? 'system'}
    options={options}
    onValueChange={(value) => chooseTheme(props, value)}
  />
);

// The picker reports the option's value, which is always one of the choices.
function chooseTheme(props: ThemeProps, value: string): void {
  const choice = themeChoices.find((entry) => entry.value === value);

  if (choice) props.onThemeChange(choice.value);
}
