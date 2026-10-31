import type { IconName } from '@repo/contracts/kit-symbols';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { Button } from '#primitives/actions/button';
import { ChromeIconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import type { SheetScreenAction } from './sheet-props';
import { drawnAsIcon, type TitleRowProps } from './sheet-title-row-props';

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

// Both ends match, so the title stays centred; a page with a text action widens them to fit its label, Back at the start and the action at the end.
function slotClass(props: TitleRowProps, edge: string): string {
  return props.action && !props.action.icon
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
      <HeaderIcon
        icon="chevron-left"
        label={props.backLabel}
        onPress={props.onBack}
      />
    );

  if (!props.onClose) return null;

  return <HeaderIcon icon="close" label={closeLabel} onPress={props.onClose} />;
}

/*
 * Material's own app bar icons are 24 boxes whose artwork carries its padding inside it; the kit's glyphs
 * fill their box, so at 24 they read a size larger than the header the sheet sits under. The header role
 * is what matches it by eye (owner, 2026-10-21).
 */
function HeaderIcon(props: {
  icon: IconName;
  label: string;
  onPress: () => void;
}): ReactElement {
  return (
    <ChromeIconButton
      variant="ghost"
      icon={props.icon}
      accessibilityLabel={props.label}
      onPress={props.onPress}
    />
  );
}

function Action({ action }: TitleRowProps): ReactElement | null {
  if (!action) return null;

  if (drawnAsIcon(action))
    return (
      <HeaderIcon
        icon={action.icon}
        label={action.label}
        onPress={action.onPress}
      />
    );

  return <TextAction {...action} />;
}

function TextAction(action: SheetScreenAction): ReactElement {
  return (
    <Button
      variant={action.destructive ? 'danger' : 'text'}
      size="sm"
      label={action.label}
      onPress={action.onPress}
    />
  );
}
