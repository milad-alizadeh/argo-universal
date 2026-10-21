import { Icon } from '@repo/kit/primitives/content/icon';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { ReactElement } from 'react';
import { themeChoices } from '#features/settings';
import type { SettingsListViewProps } from './settings-list-props';

type ThemeProps = Pick<SettingsListViewProps, 'theme' | 'onThemeChange'>;

// Paper's SettingsList: the Theme group's one row, Appearance, opens no page; its Picker chooses the theme in place.
export const themeSection = (props: ThemeProps): ReactElement => (
  <ListSection title="Theme">
    <ListItem.Picker
      title="Appearance"
      leading={<Icon name="appearance" role="row" />}
      value={props.theme ?? 'system'}
      options={themeChoices}
      onValueChange={props.onThemeChange}
    />
  </ListSection>
);
