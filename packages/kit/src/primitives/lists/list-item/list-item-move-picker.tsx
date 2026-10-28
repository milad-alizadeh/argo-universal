import {
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View, type LayoutRectangle } from 'react-native';
import { List, useMovePicker, type MovePicker } from '#primitives/lists/list';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTitle,
} from '#primitives/overlays/popover';
import type { ListItemProps } from './list-item-props';

// The picker's rows are ListItems; the row passes its own component in, as this file is part of it.
type PickerRow = ComponentType<Pick<ListItemProps, 'title' | 'onPress'>>;

interface PickerProps {
  picker: MovePicker;
  Row: PickerRow;
}

type SectionProps = PickerProps & {
  section: MovePicker['sections'][number];
};

function PickedSection({ picker, Row, section }: SectionProps): ReactElement {
  return (
    <List.Section title={section.title}>
      {section.spots.map((spot) => (
        <Row
          key={spot.key}
          title={spot.label}
          onPress={() => picker.choose(spot)}
        />
      ))}
    </List.Section>
  );
}

function PickerList({ picker, Row }: PickerProps): ReactElement {
  return (
    <List appearance="plain" fit>
      {picker.sections.map((section) => (
        <PickedSection
          key={section.key}
          picker={picker}
          Row={Row}
          section={section}
        />
      ))}
    </List>
  );
}

// Focus goes back to the moved row once it lands, not to the anchor.
const keepFocus = (event: Event): void => event.preventDefault();

function PickerContent(props: PickerProps): ReactElement {
  return (
    <PopoverContent
      align="start"
      accessibilityLabel="Move to"
      list
      onCloseAutoFocus={keepFocus}
    >
      <PopoverTitle>Move to</PopoverTitle>
      <PickerList {...props} />
    </PopoverContent>
  );
}

type FramedProps = PickerProps & { frame: LayoutRectangle | undefined };

/*
 * The Move to… picker, from the row's menu: a desktop popover against the row (Radix Popover's controlled `open`,
 * placed by its Anchor, sized to the row), and a Sheet on a phone, as PopoverContent draws one there.
 */
function PickerFrame({ frame, ...props }: FramedProps): ReactElement {
  const close = (open: boolean): void => {
    if (!open) props.picker.close();
  };

  return (
    <Popover open onOpenChange={close}>
      <PopoverAnchor>
        <View style={{ width: frame?.width, height: frame?.height }} />
      </PopoverAnchor>
      <PickerContent {...props} />
    </Popover>
  );
}

// Over the row, taking no presses, measuring the row for the anchor.
function PickerPopover(props: PickerProps): ReactElement {
  const [frame, setFrame] = useState<LayoutRectangle>();

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0"
      onLayout={(event) => setFrame(event.nativeEvent.layout)}
    >
      <PickerFrame {...props} frame={frame} />
    </View>
  );
}

// Over a movable row while its Move to… picker is open; nothing otherwise.
export function RowMovePicker(props: {
  id: string | undefined;
  Row: PickerRow;
}): ReactNode {
  const picker = useMovePicker(props.id);

  return picker ? <PickerPopover picker={picker} Row={props.Row} /> : null;
}
