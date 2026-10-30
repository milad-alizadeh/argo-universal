import type { MenuRenderFn } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type * as React from 'react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { menuInsetClassName, menuSurfaceClassName } from '#kit/menu-surface';
import { cn } from '#kit/utils';
import { SuggestionMenu } from '../rich-textarea-suggestion-menu';
import type { TypeaheadOption } from './rich-textarea-typeahead-option';
import { useMenuMaxHeight } from './rich-textarea-typeahead-viewport';

type MenuProps = Parameters<MenuRenderFn<TypeaheadOption>>[1];

const menuClassName = cn(
  menuSurfaceClassName,
  menuInsetClassName,
  'absolute bottom-full left-0 mb-7 flex w-100 flex-col',
);

// A press chooses a row without taking focus from the field.
const keepFocus = (event: React.MouseEvent): void => event.preventDefault();

function TypeaheadMenu(
  props: MenuProps & { anchor: HTMLElement },
): React.JSX.Element {
  const menu = useRef<HTMLDivElement>(null);
  const rows = props.options.map((option) => option.display);
  const choose = (index: number): void => {
    const option = props.options[index];

    if (option) props.selectOptionAndCleanUp(option);
  };

  return (
    <div
      ref={menu}
      role="group"
      aria-label={rows[0]?.groupTitle}
      className={menuClassName}
      onMouseDown={keepFocus}
    >
      <SuggestionMenu
        rows={rows}
        maxHeight={useMenuMaxHeight(props.anchor, menu)}
        onChoose={choose}
        listbox={{
          highlighted: props.selectedIndex,
          onHighlight: props.setHighlightedIndex,
        }}
      />
    </div>
  );
}

// Both triggers draw their results in the one suggestion menu, above the field.
export const renderTypeaheadMenu: MenuRenderFn<TypeaheadOption> = (
  anchorRef,
  menu,
) => {
  const anchor = anchorRef.current;

  if (!anchor || !menu.options.length) return null;

  return createPortal(<TypeaheadMenu {...menu} anchor={anchor} />, anchor);
};
