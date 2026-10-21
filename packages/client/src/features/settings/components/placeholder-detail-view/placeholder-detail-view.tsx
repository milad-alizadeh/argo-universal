import { Text } from '@repo/kit/primitives/content/text';
import { List } from '@repo/kit/primitives/lists/list';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { Page } from '@repo/kit/primitives/scaffolds/page';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { View } from 'react-native';

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
    <Page title={title} caption={caption}>
      <PlaceholderNote description={description} />
    </Page>
  );
}

type NoteProps = Pick<PlaceholderDetailViewProps, 'description'>;

// A wide page keeps the note in a row's card, where the rows will go; a phone centres it.
function PlaceholderNote(props: NoteProps): React.JSX.Element {
  return (
    <SizeClass
      compact={<CentredNote {...props} />}
      wide={<RowNote {...props} />}
    />
  );
}

function RowNote({ description }: NoteProps): React.JSX.Element {
  return (
    <List appearance="grouped">
      <ListSection>
        <ListItem title={description} tone="muted" />
      </ListSection>
    </List>
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
