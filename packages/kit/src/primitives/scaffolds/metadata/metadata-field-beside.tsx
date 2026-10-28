import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { ListItemFrame } from '#primitives/lists/list-item';
import { groupProps } from './metadata-group';

export type FieldLayoutProps = {
  title: string;
  label: string;
  grouped?: boolean;
  children: React.ReactNode;
};

// iOS: the label and the value side by side in one row, as SwiftUI's LabeledContent sets them.
export function BesideField(props: FieldLayoutProps): ReactElement {
  return (
    <ListItemFrame title={props.title} content={<BesideContent {...props} />} />
  );
}

const valueLane = 'min-w-0 flex-1 flex-row items-center justify-end gap-1';

function BesideTitle({ title }: { title: string }): ReactElement {
  return (
    <View className="min-w-0 max-w-1/2 shrink">
      <Text role="row" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

// The row reads as one element with the field's label, as a ListItem does.
function BesideContent(props: FieldLayoutProps): ReactElement {
  return (
    <View
      {...groupProps(props)}
      className="min-w-0 flex-1 flex-row items-center gap-4"
    >
      <BesideTitle title={props.title} />
      <View className={valueLane}>{props.children}</View>
    </View>
  );
}
