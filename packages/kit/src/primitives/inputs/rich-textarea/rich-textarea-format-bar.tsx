import type * as React from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { PopoverContent } from '#primitives/overlays/popover';
import type { IconName } from '../../../symbols/icon-names';
import { SelectionPopover } from './rich-textarea-selection-popover';
import type { Format } from './web/rich-textarea-formats';
import type { FieldPlacement } from './web/rich-textarea-placement';

interface FormatButton {
  format: Format;
  label: string;
  icon: IconName;
}

// Marks and Link, then blocks, as Paper groups them.
const buttonGroups: FormatButton[][] = [
  [
    { format: 'bold', label: 'Bold', icon: 'bold' },
    { format: 'italic', label: 'Italic', icon: 'italic' },
    { format: 'strikethrough', label: 'Strikethrough', icon: 'strikethrough' },
    { format: 'code', label: 'Code', icon: 'code' },
    { format: 'link', label: 'Link', icon: 'link' },
  ],
  [
    { format: 'bullet', label: 'Bulleted list', icon: 'list-bullet' },
    { format: 'number', label: 'Numbered list', icon: 'list-number' },
    { format: 'quote', label: 'Quote', icon: 'quote' },
  ],
];

export interface FormatBarProps {
  // The mouse selection and what it already has; the bar is closed without one.
  shown?: { placement: FieldPlacement; applied: Format[] };
  onFormat: (format: Format) => void;
  onClose: () => void;
}

interface GroupProps extends Pick<FormatBarProps, 'onFormat'> {
  applied: Format[];
}

type ToggleProps = GroupProps & { button: FormatButton };

const toggleLook = { variant: 'ghost', size: 'sm' } as const;

function FormatToggle(props: ToggleProps): React.JSX.Element {
  return (
    <IconButton
      {...toggleLook}
      icon={props.button.icon}
      accessibilityLabel={props.button.label}
      onPress={() => props.onFormat(props.button.format)}
    />
  );
}

function ButtonGroup({
  group,
  ...props
}: GroupProps & { group: FormatButton[] }): React.JSX.Element {
  return (
    <View className="flex-row gap-0.5">
      {group.map((button) => (
        <FormatToggle key={button.format} {...props} button={button} />
      ))}
    </View>
  );
}

// Pressing a button keeps the focus, and so the selection, in the field.
const toolbar = {
  role: 'toolbar',
  'aria-label': 'Format',
  tabIndex: -1,
  onMouseDown: (event: React.MouseEvent): void => event.preventDefault(),
  className: 'flex flex-row items-center gap-3',
} as const;

function FormatButtons({ shown, onFormat }: FormatBarProps): React.JSX.Element {
  const applied = shown?.applied ?? [];

  return (
    <div {...toolbar}>
      {buttonGroups.map((group) => (
        <ButtonGroup
          key={group[0]?.format}
          group={group}
          applied={applied}
          onFormat={onFormat}
        />
      ))}
    </div>
  );
}

const keepFocus = (event: Event): void => event.preventDefault();

const barLook = {
  side: 'top',
  align: 'start',
  sideOffset: 8,
  className: 'pointer-events-auto w-auto p-1',
  onOpenAutoFocus: keepFocus,
  onCloseAutoFocus: keepFocus,
} as const;

// The bar that floats above a mouse selection, with a button for each mark and block.
export function FormatBar(props: FormatBarProps): React.JSX.Element {
  return (
    <SelectionPopover
      placement={props.shown?.placement}
      onClose={props.onClose}
    >
      <PopoverContent {...barLook}>
        <FormatButtons {...props} />
      </PopoverContent>
    </SelectionPopover>
  );
}
