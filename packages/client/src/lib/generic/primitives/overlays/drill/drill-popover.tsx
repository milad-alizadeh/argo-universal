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
import { Text } from '#primitives/display/text';
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
      <PopoverTrigger asChild disabled={props.disabled}>
        {props.trigger}
      </PopoverTrigger>
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

function ContentBody(props: ContentProps): ReactElement {
  return (
    <View className="gap-3">
      <Text
        role="heading"
        accessibilityRole="heading"
        aria-level={2}
        className="px-4 pt-1"
      >
        {props.title}
      </Text>
      {props.children(props.close)}
    </View>
  );
}

const fieldOffset = 4;

const drillOffset = 24;

function placement(props: Props): PopoverContentProps {
  return {
    side: props.row ? 'right' : 'bottom',
    align: 'start',
    sideOffset: props.row ? drillOffset : fieldOffset,
    accessibilityLabel: props.title,
    className: 'w-80 border-0 dark:border dark:border-border p-3 bg-content',
  };
}
