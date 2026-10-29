import type { MenuRenderFn } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type * as React from 'react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  menuInsetClassName,
  menuRowsClassName,
  menuSurfaceClassName,
} from '#kit/menu-surface';
import { cn } from '#kit/utils';
import type { TypeaheadOption } from './rich-textarea-typeahead-option';
import { useTypeaheadViewport } from './rich-textarea-typeahead-viewport';

type MenuProps = Parameters<MenuRenderFn<TypeaheadOption>>[1];

type RowProps = Pick<
  MenuProps,
  'setHighlightedIndex' | 'selectOptionAndCleanUp'
> & {
  option: TypeaheadOption;
  index: number;
  selected: boolean;
};

const menuClassName = cn(
  menuSurfaceClassName,
  menuInsetClassName,
  menuRowsClassName,
  'absolute bottom-full left-0 mb-7 flex w-100 flex-col overflow-x-hidden overflow-y-auto overscroll-contain',
);

const rowClassName =
  'flex shrink-0 cursor-default rounded-xl p-2 text-start outline-none';

const keepFocus = (event: React.MouseEvent): void => event.preventDefault();

const rowAttributesBase = {
  type: 'button',
  role: 'option',
  tabIndex: -1,
} as const;

function rowAttributes(props: RowProps): React.ComponentProps<'button'> {
  return {
    ...rowAttributesBase,
    id: `typeahead-item-${props.index}`,
    ref: (element) => props.option.setRefElement(element),
    'aria-selected': props.selected,
    className: cn(
      rowClassName,
      props.option.display.className,
      props.selected && 'bg-selected',
    ),
    ...rowEvents(props),
  };
}

const groupTitleClassName =
  'shrink-0 px-2 pt-1.5 pb-1 text-badge font-medium text-muted-foreground';

function MenuRow(props: RowProps): React.JSX.Element {
  return (
    <button {...rowAttributes(props)}>{props.option.display.content}</button>
  );
}

function startsGroup(props: MenuProps, index: number): boolean {
  return (
    props.options[index - 1]?.display.group !==
    props.options[index]?.display.group
  );
}

function rowsOf(
  props: MenuProps,
  option: TypeaheadOption,
  index: number,
): React.JSX.Element {
  const selected = props.selectedIndex === index;

  return (
    <MenuRow key={option.key} {...props} {...{ option, index, selected }} />
  );
}

// Each group's title heads its options, which sit together in the order the sources are given.
function MenuRows(props: MenuProps): React.JSX.Element[] {
  return props.options.flatMap((option, index) => [
    ...(startsGroup(props, index)
      ? [
          <div key={`${option.key}-title`} className={groupTitleClassName}>
            {option.display.title}
          </div>,
        ]
      : []),
    rowsOf(props, option, index),
  ]);
}

function TypeaheadMenu(
  props: MenuProps & { anchor: HTMLElement },
): React.JSX.Element {
  const menu = useRef<HTMLDivElement>(null);
  useTypeaheadViewport(props.anchor, menu, props.selectedIndex);
  const title = props.options[0]?.display.title;

  return (
    <div ref={menu} role="group" aria-label={title} className={menuClassName}>
      {MenuRows(props)}
    </div>
  );
}

export const renderTypeaheadMenu: MenuRenderFn<TypeaheadOption> = (
  anchorRef,
  menu,
) => {
  const anchor = anchorRef.current;

  if (!anchor || !menu.options.length) return null;

  return createPortal(<TypeaheadMenu {...menu} anchor={anchor} />, anchor);
};

function rowEvents(
  props: RowProps,
): Pick<
  React.ComponentProps<'button'>,
  'onMouseDown' | 'onMouseEnter' | 'onClick'
> {
  return {
    onMouseDown: keepFocus,
    onMouseEnter: () => props.setHighlightedIndex(props.index),
    onClick: () => props.selectOptionAndCleanUp(props.option),
  };
}
