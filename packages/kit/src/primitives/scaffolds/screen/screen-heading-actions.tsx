import type { ComponentProps, ReactElement } from 'react';
import {
  HeaderButtons,
  isSubmenu,
  type HeaderEntry,
  type IconAction,
  type ScreenHeader,
} from '#primitives/actions/action';
import { Button } from '#primitives/actions/button';
import type { IconButtonSize } from '#primitives/actions/icon-button';

interface HeadingActionsProps {
  header: ScreenHeader;
  size?: IconButtonSize;
}

/*
 * Argo's drawing of a Screen's header: Select, its Actions with one overflow menu, then its primary Action. A page's
 * heading names its primary Action on a button, so the page says what it wants; a list column's heading has no room
 * for a label and keeps the icon, as its smaller buttons do.
 */
export function HeadingActions({
  header,
  size,
}: HeadingActionsProps): ReactElement {
  const look = { size };
  const { direct, overflow, label } = header;

  return (
    <>
      <SelectEntry select={header.select} />
      <Buttons direct={direct} overflow={overflow} label={label} look={look} />
      <PrimaryEntry header={header} size={size} />
    </>
  );
}

function PrimaryEntry({
  header,
  size,
}: HeadingActionsProps): ReactElement | null {
  const named = namedPrimary(header, size);

  if (named) return <PrimaryButton action={named} />;

  return (
    <Buttons
      direct={primaryEntries(header)}
      overflow={[]}
      label={header.label}
      look={{ size }}
    />
  );
}

// Only a page's heading names its primary Action; a list column's keeps its icon buttons.
function namedPrimary(
  header: ScreenHeader,
  size: IconButtonSize | undefined,
): IconAction | null {
  if (size !== undefined) return null;

  return pressPrimary(header);
}

// Only a press Action names itself: a submenu is a menu, and keeps its icon trigger.
const pressPrimary = ({ primary }: ScreenHeader): IconAction | null =>
  primary && !isSubmenu(primary) ? primary : null;

function PrimaryButton({ action }: { action: IconAction }): ReactElement {
  return (
    <Button
      label={action.label}
      icon={action.icon}
      size="sm"
      disabled={action.disabled}
      onPress={action.onPress}
    />
  );
}

const primaryEntries = ({ primary }: ScreenHeader): HeaderEntry[] =>
  primary ? [primary] : [];

// The Select entry an Argo-drawn heading draws, where a phone's stack header draws a stock bar button instead.
function SelectEntry({
  select,
}: Pick<ScreenHeader, 'select'>): ReactElement | null {
  if (!select) return null;

  return <Button label="Select" variant="text" onPress={select} />;
}

type ButtonsProps = ComponentProps<typeof HeaderButtons>;

function Buttons(props: ButtonsProps): ReactElement | null {
  if (!props.direct.length && !props.overflow.length) return null;

  return <HeaderButtons {...props} />;
}
