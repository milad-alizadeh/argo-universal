import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { SettingsPage } from '#lib/product/settings-page';
import { FieldGroup } from '#primitives/field-group';
import { FieldSection } from '#primitives/field-section';
import { ListItem } from '#primitives/list-item';
import { useWide } from '../../../lib/generic/use-wide';

export interface SettingsPlaceholderPageProps {
  title: string;
  caption?: string;
  // What will appear here once the App can show it.
  description: string;
}

// A Settings page whose content the App cannot show yet: its title and caption, and a note in place of its rows.
export function SettingsPlaceholderPage({
  title,
  caption,
  description,
}: SettingsPlaceholderPageProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-sidebar wide:bg-transparent">
      <SettingsPage title={title} caption={caption}>
        <PlaceholderNote description={description} />
      </SettingsPage>
    </View>
  );
}

// A wide page keeps the note in a row's card, where the rows will go; a phone centres it.
function PlaceholderNote({
  description,
}: Pick<SettingsPlaceholderPageProps, 'description'>): React.JSX.Element {
  if (useWide())
    return (
      <FieldGroup>
        <FieldSection>
          <ListItem title={description} />
        </FieldSection>
      </FieldGroup>
    );
  return (
    <View className="flex-1 items-center justify-center px-gutter py-6">
      <Text role="secondary" className="text-center">
        {description}
      </Text>
    </View>
  );
}
