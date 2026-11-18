import type { ComponentProps, ReactElement } from 'react';
import { HeaderTrigger, submenuLabel } from '#primitives/actions/action';
import type { IconButtonSize } from '#primitives/actions/icon-button';
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

type SheetProps = ComponentProps<typeof Sheet>;

const sheetProps = (
  options: PageOptions,
  trigger: SheetProps['trigger'],
): Omit<SheetProps, 'children'> => ({
  open: options.open,
  onOpenChange: options.onOpenChange,
  label: optionsLabel,
  trigger,
  popoverPlacement: belowFromEnd,
  inset: true,
});

function OptionsSheet(props: {
  options: PageOptions;
  trigger?: SheetProps['trigger'];
}): ReactElement {
  return (
    <Sheet {...sheetProps(props.options, props.trigger)}>
      <Sheet.Screen name="options" title={optionsLabel}>
        {props.options.content}
      </Sheet.Screen>
    </Sheet>
  );
}

// The sheet's trigger passes its press handler, and on the web Radix's handlers and ref, through these.
type TriggerHandlers = Partial<
  Pick<ComponentProps<typeof HeaderTrigger>, 'onPress'>
>;

type TriggerProps = OptionsEntryProps & TriggerHandlers;

// On every width the button is the header's icon, its count a badge on the corner; its spoken name says both.
function OptionsTrigger(props: TriggerProps): ReactElement {
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
