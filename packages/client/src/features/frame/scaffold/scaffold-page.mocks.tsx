import type * as React from 'react';
import { View } from 'react-native';
import {
  IconButton,
  type IconButtonProps,
} from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { Menu } from '#primitives/overlays/menu';
import { PageHeader } from '../../../lib/product/page-header';

const moreActionsButton: IconButtonProps = {
  variant: 'ghost',
  className: 'size-7 p-0 sm:size-7',
  accessibilityLabel: 'More actions',
  icon: 'more',
  iconClassName: 'text-muted-foreground',
  size: 'sm',
};

export function MockText({
  testID,
  text,
}: {
  testID: string;
  text: string;
}): React.JSX.Element {
  return (
    <View className="p-4">
      <Text testID={testID}>{text}</Text>
    </View>
  );
}

const exampleActions = [{ label: 'Example action', onPress: (): void => {} }];

function MoreActionsMenu(): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel={moreActionsButton.accessibilityLabel}
      trigger={<IconButton {...moreActionsButton} />}
      actions={exampleActions}
    />
  );
}

// A stand-in page that names its section, with a header action.
export function MockPage({ title }: { title: string }): React.JSX.Element {
  return (
    <View className="flex-1">
      <PageHeader title={`${title} page`} actions={<MoreActionsMenu />} />
      <View className="flex-1 p-4">
        <Text testID="detail-content">{title} detail</Text>
      </View>
    </View>
  );
}
