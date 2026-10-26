import type { ComponentProps, ReactElement } from 'react';
import {
  HeaderButtons,
  type HeaderEntry,
  type ScreenHeader,
} from '#primitives/actions/action';
import { Button } from '#primitives/actions/button';
import type { IconButtonSize } from '#primitives/actions/icon-button';

interface HeadingActionsProps {
  header: ScreenHeader;
  size?: IconButtonSize;
}

// Argo's drawing of a Screen's header: Select, its Actions with one overflow menu, then its primary Action.
export function HeadingActions({
  header,
  size,
}: HeadingActionsProps): ReactElement {
  const look = { size };
  const { direct, overflow, label } = header;
  const primary = primaryEntries(header);

  return (
    <>
      <SelectEntry select={header.select} />
      <Buttons direct={direct} overflow={overflow} label={label} look={look} />
      <Buttons direct={primary} overflow={[]} label={label} look={look} />
    </>
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
