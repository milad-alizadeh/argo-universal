import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#kit/utils';
import { Button } from '#primitives/actions/button';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import type { SheetPageEntry } from './sheet-pages';

type TitleRowProps = Pick<SheetPageEntry, 'title' | 'action'> & {
  // A pushed page's way back to the page below it.
  backLabel?: string;
  onBack: () => void;
  /*
   * The sheet's own way out, which only the root page carries: there is nothing below it to go back to, and
   * the leading end of its title row would otherwise stand empty (owner, 2026-10-21).
   */
  onClose?: () => void;
};

// A page's title, centred, with Back or Close before it and the page's action after it.
export function SheetTitleRow(props: TitleRowProps): ReactElement {
  return (
    <View className="h-13 shrink-0 flex-row items-center px-4">
      <View className={slotClass(props, 'items-start')}>
        <LeadingButton {...props} />
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

const closeLabel = 'Close';

// Back on a pushed page, the sheet's close on the root, and nothing on a page that is given neither.
function LeadingButton(props: TitleRowProps): ReactElement | null {
  if (props.backLabel)
    return (
      <LeadingIcon
        icon="chevron-left"
        label={props.backLabel}
        onPress={props.onBack}
      />
    );

  if (!props.onClose) return null;

  return (
    <LeadingIcon icon="close" label={closeLabel} onPress={props.onClose} />
  );
}

/*
 * Material's own app bar icons are 24 boxes whose artwork carries its padding inside it; the kit's glyphs
 * fill their box, so at 24 they read a size larger than the header the sheet sits under. The header role
 * is what matches it by eye (owner, 2026-10-21).
 */
const leadingRole = Platform.OS === 'android' ? 'action' : 'title';

function LeadingIcon(props: {
  icon: 'chevron-left' | 'close';
  label: string;
  onPress: () => void;
}): ReactElement {
  return (
    <IconButton
      variant="ghost"
      icon={props.icon}
      iconRole={leadingRole}
      accessibilityLabel={props.label}
      onPress={props.onPress}
    />
  );
}

function Action({ action }: TitleRowProps): ReactElement | null {
  if (!action) return null;

  return (
    <Button
      variant={action.destructive ? 'danger' : 'text'}
      size="sm"
      label={action.label}
      onPress={action.onPress}
    />
  );
}
