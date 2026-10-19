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
    <Popover open={open} onOpenChange={setOpen} openOnHover={props.row}>
      <PopoverTrigger disabled={props.disabled}>{props.trigger}</PopoverTrigger>
      <DrillContent {...props} close={choiceClose(props, setOpen)} />
    </Popover>
  );
}

const stayOpen = (): void => {};

// The choices call close after a pick; keepOpen leaves the popover to a click outside or Escape.
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

// Paper: a row's choices open beside the menu with no title; the title names the popover for assistive tech.
function DrillContent(props: ContentProps): ReactElement {
  return createElement(
    PopoverContent,
    placement(props),
    props.children(props.close),
  );
}

const fieldOffset = 4;

// A row ends 5px inside its menu (the list's 4px padding and the popover's 1px border); Paper leaves 12px beyond the menu.
const menuInset = 5;

const menuGap = 12;

const drillOffset = menuInset + menuGap;

// A field's choices match the field's width; a row's are Paper's 284px panel.
const placements = {
  row: {
    side: 'right',
    sideOffset: drillOffset,
    className: 'w-71 overflow-hidden p-0',
  },
  field: {
    side: 'bottom',
    sideOffset: fieldOffset,
    className: 'w-80 overflow-hidden p-0',
  },
} as const satisfies Record<string, PopoverContentProps>;

function placement(props: Props): PopoverContentProps {
  return {
    ...placements[props.row ? 'row' : 'field'],
    align: 'start',
    accessibilityLabel: props.title,
  };
}
