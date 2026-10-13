import type { MenuRenderFn } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { MenuOption } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '#lib/generic/utils';
import type { ReferenceOption } from '../rich-textarea-references';
import { ReferenceGlyph } from './rich-textarea-reference-token';

export class ReferenceMenuOption extends MenuOption {
  readonly reference: ReferenceOption;

  constructor(reference: ReferenceOption) {
    super(`reference-${reference.number}`);
    this.reference = reference;
  }
}

interface RowProps {
  option: ReferenceMenuOption;
  selected: boolean;
  onHover: () => void;
  onChoose: () => void;
}

const rowClassName =
  'flex cursor-default items-center gap-2 rounded-xl p-2 outline-none';

const numberClassName =
  'w-9 shrink-0 text-start type-secondary text-muted-foreground';

const titleClassName =
  'min-w-0 flex-1 truncate text-start type-control text-foreground';

function RowContent({
  reference,
}: {
  reference: ReferenceOption;
}): React.JSX.Element {
  return (
    <>
      <ReferenceGlyph state={reference.state} />
      <span className={numberClassName}>#{reference.number}</span>
      <span className={titleClassName}>{reference.title}</span>
    </>
  );
}

// The mouse goes down on a row without taking focus from the field, so the caret stays where it was.
const keepFocus = (event: React.MouseEvent): void => event.preventDefault();

const rowAttributes = {
  type: 'button',
  role: 'option',
  tabIndex: -1,
  onMouseDown: keepFocus,
} as const;

function ReferenceRow(props: RowProps): React.JSX.Element {
  const { option, selected, onHover, onChoose } = props;

  return (
    <button
      {...rowAttributes}
      {...{ 'aria-selected': selected }}
      className={cn(rowClassName, selected && 'bg-accent')}
      onMouseEnter={onHover}
      onClick={onChoose}
    >
      <RowContent reference={option.reference} />
    </button>
  );
}

interface MenuProps {
  options: ReferenceMenuOption[];
  selectedIndex: number | null;
  onHover: (index: number) => void;
  onChoose: (option: ReferenceMenuOption) => void;
}

function MenuRows(props: MenuProps): React.JSX.Element[] {
  return props.options.map((option, index) => (
    <ReferenceRow
      key={option.key}
      option={option}
      selected={props.selectedIndex === index}
      onHover={() => props.onHover(index)}
      onChoose={() => props.onChoose(option)}
    />
  ));
}

// The popover of the Composer editor design: a header, then a row for each match.
function ReferenceMenu(props: MenuProps): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label="Issues and pull requests"
      className="absolute bottom-full left-0 mb-7 flex w-100 flex-col gap-0.5 overflow-clip rounded-2xl border border-border bg-popover p-1 shadow-card"
    >
      <div className="px-2 pt-1.5 pb-1 text-badge font-medium text-muted-foreground">
        Issues and pull requests
      </div>
      {MenuRows(props)}
    </div>
  );
}

// Drawn in the anchor the typeahead keeps at the caret, above the line being typed.
export const renderReferenceMenu: MenuRenderFn<ReferenceMenuOption> = (
  anchorElementRef,
  menu,
) => {
  const anchor = anchorElementRef.current;
  const { options, selectedIndex } = menu;

  if (!anchor || options.length === 0) return null;

  const { setHighlightedIndex: onHover, selectOptionAndCleanUp: onChoose } =
    menu;

  return createPortal(
    <ReferenceMenu {...{ options, selectedIndex, onHover, onChoose }} />,
    anchor,
  );
};
