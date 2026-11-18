import type { ComponentProps, ReactElement } from 'react';
import {
  HeaderButtons,
  type HeaderEntry,
  type ScreenHeader,
} from '#primitives/actions/action';
import { Button } from '#primitives/actions/button';
import type { IconButtonSize } from '#primitives/actions/icon-button';
import { PageOptionsEntry } from './screen-page-options';
import type { PageOptions } from './screen-props';

interface HeadingActionsProps {
  header: ScreenHeader;
  size?: IconButtonSize;
  options?: PageOptions | null;
}

/*
 * Argo's drawing of a Screen's header: Select, the page's Options, its Actions with one overflow menu, then its primary
 * Action, all icons; a wide window names the Options button.
 */
export function HeadingActions({
  header,
  size,
  options,
}: HeadingActionsProps): ReactElement {
  const shared = { label: header.label, look: { size } };

  return (
    <>
      <SelectEntry select={header.select} />
      {options ? <PageOptionsEntry options={options} size={size} /> : null}
      <Buttons {...shared} direct={header.direct} overflow={header.overflow} />
      <Buttons {...shared} direct={primaryEntries(header)} overflow={[]} />
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
