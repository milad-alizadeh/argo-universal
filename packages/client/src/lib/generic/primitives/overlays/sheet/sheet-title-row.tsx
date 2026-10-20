import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Button } from '#primitives/actions/button';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import type { SheetPageEntry } from './sheet-pages';

type TitleRowProps = Pick<SheetPageEntry, 'title' | 'action'> & {
  // A pushed page's way back to the page below it.
  backLabel?: string;
  onBack: () => void;
};

// A page's title, centred, with Back before it on a pushed page and the page's action after it.
export function SheetTitleRow(props: TitleRowProps): ReactElement {
  return (
    <View className="h-13 shrink-0 flex-row items-center px-4">
      <View className={slotClass(props, 'items-start')}>
        <BackButton {...props} />
      </View>
      <Title {...props} />
      <View className={slotClass(props, 'items-end')}>
        <Action {...props} />
      </View>
    </View>
  );
}

// Both ends match, so the title stays centred; a page with an action widens them to fit its label, Back at the start and the action at the end.
function slotClass(props: TitleRowProps, edge: string): string {
  return props.action
    ? cn('h-11 w-22 justify-center', edge)
    : 'size-11 items-center justify-center';
}

function Title(props: TitleRowProps): ReactElement {
  return (
    <Text
      role="control"
      accessibilityRole="heading"
      numberOfLines={1}
      className="flex-1 text-center"
    >
      {props.title}
    </Text>
  );
}

function BackButton(props: TitleRowProps): ReactElement | null {
  if (!props.backLabel) return null;

  return (
    <IconButton
      variant="ghost"
      icon="chevron-left"
      iconRole="title"
      accessibilityLabel={props.backLabel}
      onPress={props.onBack}
    />
  );
}

function Action({ action }: TitleRowProps): ReactElement | null {
  if (!action) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      tone={action.destructive ? 'danger' : undefined}
      label={action.label}
      onPress={action.onPress}
    />
  );
}
