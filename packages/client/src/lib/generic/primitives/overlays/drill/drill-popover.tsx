import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { View } from 'react-native';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
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
      <DrillContent {...props} close={() => setOpen(false)} />
    </Popover>
  );
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

function DrillContent(props: ContentProps): ReactElement {
  return createElement(
    PopoverContent,
    placement(props),
    <ContentBody {...props} />,
  );
}

// Paper: a row's choices open beside the menu under their own title.
function ContentBody(props: ContentProps): ReactElement {
  if (!props.row) return <>{props.children(props.close)}</>;

  return (
    <View>
      <PopoverTitle>{props.title}</PopoverTitle>
      {props.children(props.close)}
    </View>
  );
}

const fieldOffset = 4;

// The menu's 16px inset, less the 12px gap Paper leaves between menu and choices.
const drillOffset = -4;

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
