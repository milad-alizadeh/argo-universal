import { Icon } from '@repo/kit/primitives/content/icon';
import { Combobox } from '@repo/kit/primitives/inputs/combobox';
import { ListSection } from '@repo/kit/primitives/lists/list';
import type { ReactElement } from 'react';
import { themeChoices } from '#features/settings';
import type { SettingsListViewProps } from './settings-list-props';

type ThemeProps = Pick<SettingsListViewProps, 'theme' | 'onThemeChange'>;

// Paper's SettingsList: the Theme group's one row, Appearance, opens no page; its Picker chooses the theme in place.
export const themeSection = (props: ThemeProps): ReactElement => (
  <ListSection title="Theme">
    <Combobox
      variant="row"
      label="Appearance"
      valueLeading={<Icon name="appearance" size="md" />}
      value={props.theme ?? 'system'}
      options={themeChoices}
      searchable={false}
      onValueChange={props.onThemeChange}
    />
  </ListSection>
);
