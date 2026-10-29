import {
  MenuOption,
  type MenuRenderFn,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type * as React from 'react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  menuInsetClassName,
  menuRowsClassName,
  menuSurfaceClassName,
} from '#kit/menu-surface';
import { cn } from '#kit/utils';
import type { ComposerSuggestion } from '../rich-textarea-suggestions';
import { useSuggestionViewport } from './rich-textarea-suggestion-viewport';

export class SuggestionOption extends MenuOption {
  constructor(
    readonly suggestion: ComposerSuggestion,
    readonly groupTitle: string,
    source: string,
  ) {
    super(`${source}-${suggestion.id}`);
  }
}

type MenuProps = Parameters<MenuRenderFn<SuggestionOption>>[1];

type RowProps = Pick<
  MenuProps,
  'setHighlightedIndex' | 'selectOptionAndCleanUp'
> & {
  option: SuggestionOption;
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
  'flex shrink-0 cursor-default flex-col gap-0.5 rounded-xl p-2 text-start outline-none';

const keepFocus = (event: React.MouseEvent): void => event.preventDefault();

function SuggestionDetail({
  detail,
}: Pick<ComposerSuggestion, 'detail'>): React.JSX.Element | null {
  return detail ? (
    <span className="type-secondary text-muted-foreground">{detail}</span>
  ) : null;
}

function RowContent({
  suggestion,
}: {
  suggestion: ComposerSuggestion;
}): React.JSX.Element {
  return (
    <>
      <span className="type-control text-foreground">{suggestion.label}</span>
      <SuggestionDetail detail={suggestion.detail} />
    </>
  );
}

function rowAttributes(props: RowProps): React.ComponentProps<'button'> {
  return {
    type: 'button',
    role: 'option',
    tabIndex: -1,
    id: `typeahead-item-${props.index}`,
    ref: (element) => props.option.setRefElement(element),
    'aria-selected': props.selected,
    className: cn(rowClassName, props.selected && 'bg-selected'),
    onMouseDown: keepFocus,
    onMouseEnter: () => props.setHighlightedIndex(props.index),
    onClick: () => props.selectOptionAndCleanUp(props.option),
  };
}

function SuggestionRow(props: RowProps): React.JSX.Element {
  return (
    <button {...rowAttributes(props)}>
      <RowContent suggestion={props.option.suggestion} />
    </button>
  );
}

function MenuRows(props: MenuProps): React.JSX.Element[] {
  return props.options.map((option, index) => (
    <SuggestionRow
      key={option.key}
      {...props}
      option={option}
      index={index}
      selected={props.selectedIndex === index}
    />
  ));
}

function SuggestionMenu(
  props: MenuProps & { anchor: HTMLElement },
): React.JSX.Element {
  const menu = useRef<HTMLDivElement>(null);
  useSuggestionViewport(props.anchor, menu);
  const title = props.options[0]?.groupTitle;

  return (
    <div ref={menu} role="group" aria-label={title} className={menuClassName}>
      <div className="shrink-0 px-2 pt-1.5 pb-1 text-badge font-medium text-muted-foreground">
        {title}
      </div>
      {MenuRows(props)}
    </div>
  );
}

export const renderSuggestionMenu: MenuRenderFn<SuggestionOption> = (
  anchorRef,
  menu,
) => {
  const anchor = anchorRef.current;

  if (!anchor || !menu.options.length) return null;

  return createPortal(<SuggestionMenu {...menu} anchor={anchor} />, anchor);
};
