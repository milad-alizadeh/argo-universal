import type { MenuRenderFn } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type * as React from 'react';
import { useEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { menuInsetClassName, menuSurfaceClassName } from '#kit/menu-surface';
import { cn } from '#kit/utils';
import {
  SuggestionMenu,
  type SuggestionMenuProps,
} from '../rich-textarea-suggestion-menu';
import type { TypeaheadOption } from './rich-textarea-typeahead-option';
import { useMenuMaxHeight } from './rich-textarea-typeahead-viewport';

type MenuProps = Parameters<MenuRenderFn<TypeaheadOption>>[1];

type TypeaheadMenuProps = MenuProps & { anchor: HTMLElement };

type MenuSurface = {
  menu: RefObject<HTMLDivElement | null>;
  maxHeight: number;
};

const menuClassName = cn(
  menuSurfaceClassName,
  menuInsetClassName,
  'absolute bottom-full left-0 mb-7 flex w-100 flex-col',
);

const keepFocus = (event: MouseEvent): void => event.preventDefault();

// A press chooses a row without taking focus from the field.
function useKeepFocus(menu: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const element = menu.current;
    element?.addEventListener('mousedown', keepFocus);

    return (): void => element?.removeEventListener('mousedown', keepFocus);
  }, [menu]);
}

type Pointer = { moved: boolean; position: string | null };

// A move to a new spot, not the repeat a layout change makes at the same one.
function trackMove(pointer: Pointer, event: MouseEvent): void {
  const next = `${event.clientX},${event.clientY}`;

  if (pointer.position !== null && pointer.position !== next) {
    pointer.moved = true;
  }

  pointer.position = next;
}

/*
 * Whether the pointer has moved since the options last changed. A menu that opens or refilters under a resting
 * pointer reports a hover on the row beneath it, which must not take the highlight from the first option.
 */
function usePointerMoved(options: MenuProps['options']): RefObject<Pointer> {
  const pointer = useRef<Pointer>({ moved: false, position: null });

  useEffect(() => {
    pointer.current.moved = false;
  }, [options]);

  useEffect(() => {
    const track = (event: MouseEvent): void =>
      trackMove(pointer.current, event);

    window.addEventListener('mousemove', track, true);

    return (): void => window.removeEventListener('mousemove', track, true);
  }, []);

  return pointer;
}

const chooser =
  (props: MenuProps) =>
  (index: number): void => {
    const option = props.options[index];

    if (option) props.selectOptionAndCleanUp(option);
  };

// Lexical's options as the menu takes them: rows highlighted from the field and chosen through Lexical.
function menuContent(
  props: MenuProps,
  pointer: RefObject<Pointer>,
): Omit<SuggestionMenuProps, 'maxHeight'> {
  return {
    rows: props.options.map((option) => option.display),
    onChoose: chooser(props),
    listbox: {
      highlighted: props.selectedIndex,
      onHighlight: (index) => {
        if (pointer.current.moved) props.setHighlightedIndex(index);
      },
    },
  };
}

// The menu's surface above the field, and the height the window leaves it.
function useMenuSurface(anchor: HTMLElement): MenuSurface {
  const menu = useRef<HTMLDivElement>(null);
  useKeepFocus(menu);

  return { menu, maxHeight: useMenuMaxHeight(anchor, menu) };
}

function TypeaheadMenu(props: TypeaheadMenuProps): React.JSX.Element {
  const { menu, maxHeight } = useMenuSurface(props.anchor);
  const content = menuContent(props, usePointerMoved(props.options));

  return (
    <div
      ref={menu}
      role="group"
      aria-label={content.rows[0]?.groupTitle}
      className={menuClassName}
    >
      <SuggestionMenu {...content} maxHeight={maxHeight} />
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
