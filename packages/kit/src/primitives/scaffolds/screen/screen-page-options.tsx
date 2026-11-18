import type { ReactElement } from 'react';
import { useWide } from '#kit/use-wide/use-wide';
import { HeaderTrigger, submenuLabel } from '#primitives/actions/action';
import type { IconButtonSize } from '#primitives/actions/icon-button';
import { MenuTrigger } from '#primitives/overlays/menu';
import { Sheet } from '#primitives/overlays/sheet';
import type { PageOptions } from './screen-props';

const optionsLabel = 'Options';

export const optionsIcon = 'filters';

// The Options button's spoken name: its label, then its badge, as a header submenu's reads.
export const optionsSpoken = ({ badge }: Pick<PageOptions, 'badge'>): string =>
  submenuLabel({ label: optionsLabel, badge });

interface OptionsEntryProps {
  options: PageOptions;
  size?: IconButtonSize;
}

/*
 * The page's Options button in a heading the Screen draws. Anchored, it holds the sheet, which a wide window opens as a
 * popover on it; in a navigator's header it only opens the sheet the Screen holds (`PageOptionsSheet`).
 */
export function PageOptionsEntry(props: OptionsEntryProps): ReactElement {
  const { options } = props;

  if (!options.anchored)
    return (
      <OptionsTrigger {...props} onPress={() => options.onOpenChange(true)} />
    );

  return (
    <OptionsSheet options={options} trigger={<OptionsTrigger {...props} />} />
  );
}

// The sheet a navigator's Options button opens, held by the Screen so the options draw inside its tree.
export function PageOptionsSheet({
  options,
}: {
  options: PageOptions | null;
}): ReactElement | null {
  if (!options || options.anchored) return null;

  return <OptionsSheet options={options} />;
}

// The button sits at the header's end, so its popover opens below it and keeps to the window.
const belowFromEnd = { side: 'bottom', align: 'end' } as const;

function OptionsSheet(props: {
  options: PageOptions;
  trigger?: ReactElement<{ onPress?: () => void }>;
}): ReactElement {
  const { options } = props;

  return (
    <Sheet
      open={options.open}
      onOpenChange={options.onOpenChange}
      label={optionsLabel}
      trigger={props.trigger}
      popoverPlacement={belowFromEnd}
      inset
    >
      <Sheet.Screen name="options" title={optionsLabel}>
        {options.content}
      </Sheet.Screen>
    </Sheet>
  );
}

// The sheet's trigger passes its press handlers and ref through the rest.
type TriggerProps = OptionsEntryProps & Record<string, unknown>;

// A wide window's button names itself and its count; a narrow one is the header's icon, its badge on the corner.
function OptionsTrigger(props: TriggerProps): ReactElement {
  if (useWide()) return <LabelledTrigger {...props} />;

  const { options, size, ...handlers } = props;

  return (
    <HeaderTrigger
      {...handlers}
      icon={optionsIcon}
      badge={options.badge}
      label={optionsSpoken(options)}
      size={size}
    />
  );
}

// The toolbar pill a popover opens from: the icon, the label with its count, and a down chevron.
function LabelledTrigger({
  options,
  size: _size,
  ...handlers
}: TriggerProps): ReactElement {
  return (
    <MenuTrigger
      {...handlers}
      label={labelWithCount(options)}
      accessibilityLabel={optionsSpoken(options)}
      icon={optionsIcon}
    />
  );
}

const labelWithCount = ({ badge }: Pick<PageOptions, 'badge'>): string =>
  badge?.kind === 'count' && badge.count > 0
    ? `${optionsLabel} · ${badge.count}`
    : optionsLabel;
