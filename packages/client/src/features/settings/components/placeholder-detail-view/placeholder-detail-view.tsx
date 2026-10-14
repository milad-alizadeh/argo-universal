import type * as React from 'react';
import { View } from 'react-native';
import { SettingsPage } from '#lib/product/settings-page';
import { Text } from '#primitives/display/text';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';

export interface PlaceholderDetailViewProps {
  title: string;
  caption?: string;
  // What will appear here once the App can show it.
  description: string;
}

// A Settings page whose content the App cannot show yet: its title and caption, and a note in place of its rows.
export function PlaceholderDetailView({
  title,
  caption,
  description,
}: PlaceholderDetailViewProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-sidebar wide:bg-transparent">
      <SettingsPage title={title} caption={caption}>
        <PlaceholderNote description={description} />
      </SettingsPage>
    </View>
  );
}

type NoteProps = Pick<PlaceholderDetailViewProps, 'description'>;

// A wide page keeps the note in a row's card, where the rows will go; a phone centres it.
function PlaceholderNote(props: NoteProps): React.JSX.Element {
  if (useWide()) return <RowNote {...props} />;

  return <CentredNote {...props} />;
}

function RowNote({ description }: NoteProps): React.JSX.Element {
  return (
    <GroupedList>
      <GroupedListSection>
        <GroupedListItem label={description} />
      </GroupedListSection>
    </GroupedList>
  );
}

function CentredNote({ description }: NoteProps): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center px-gutter py-6">
      <Text role="secondary" className="text-center">
        {description}
      </Text>
    </View>
  );
}
