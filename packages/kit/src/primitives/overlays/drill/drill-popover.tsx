import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  type PopoverContentProps,
} from '#primitives/overlays/popover';
import type { DrillProps } from './drill-props';

type Props = DrillProps & { row: boolean };

type ContentProps = Props & { close: () => void };

export function DrillPopover(props: Props): ReactElement {
  const [open, setOpen] = useOpenState(props.onClose);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger disabled={props.disabled}>{props.trigger}</PopoverTrigger>
      <DrillContent {...props} close={choiceClose(props, setOpen)} />
    </Popover>
  );
}

const stayOpen = (): void => {};

// The choices call close after a pick; keepOpen leaves the popover to a click outside or Escape. Escape closes only the choices and returns to the menu beside them; a click outside closes both.
function choiceClose(
  props: Props,
  setOpen: Dispatch<SetStateAction<boolean>>,
): () => void {
  return props.keepOpen ? stayOpen : () => setOpen(false);
}

function useOpenState(
  onClose = (): void => {},
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [open, setOpen] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open && wasOpen.current) onClose();
    wasOpen.current = open;
  }, [open, onClose]);

  return [open, setOpen];
}

// A row's choices open beside the menu with no title; the title names the popover for assistive tech.
function DrillContent(props: ContentProps): ReactElement {
  return createElement(
    PopoverContent,
    placement(props),
    props.children(props.close, false),
  );
}

const fieldOffset = 4;

// A row ends 4px inside its menu, the list's side inset in a popover (menu-surface.ts).
const menuInset = 4;

// The choices overlap the menu's edge by 16px, their top 1px above the row's.
const menuOverlap = 16;

const choicesLift = 1;

const drillOffset = menuInset - menuOverlap;

// A field's choices match the field's width; a row's are a fixed-width panel.
const placements = {
  row: {
    side: 'right',
    sideOffset: drillOffset,
    alignOffset: -choicesLift,
    className: 'w-71 overflow-hidden p-0',
  },
  field: {
    side: 'bottom',
    sideOffset: fieldOffset,
    list: true,
  },
} as const satisfies Record<string, PopoverContentProps>;

function placement(props: ContentProps): PopoverContentProps {
  return {
    ...placements[props.row ? 'row' : 'field'],
    align: 'start',
    accessibilityLabel: props.title,
  };
}
