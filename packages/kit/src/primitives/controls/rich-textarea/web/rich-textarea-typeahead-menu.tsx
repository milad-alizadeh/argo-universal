import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { MenuRenderFn } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $getRoot, KEY_ESCAPE_COMMAND, type LexicalEditor } from 'lexical';
import type * as React from 'react';
import { useEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { menuInsetClassName, menuSurfaceClassName } from '#kit/menu-surface';
import { cn } from '#kit/utils';
import {
  SuggestionMenu,
  type SuggestionMenuProps,
} from '../rich-textarea-suggestion-menu';
import { useGatedHighlight } from './rich-textarea-typeahead-hover';
import type {
  TypeaheadInteraction,
  TypeaheadOption,
} from './rich-textarea-typeahead-option';
import { useMenuMaxHeight } from './rich-textarea-typeahead-viewport';

type MenuProps = Parameters<MenuRenderFn<TypeaheadOption>>[1];

type TypeaheadMenuProps = MenuProps & {
  anchor: HTMLElement;
  interaction: TypeaheadInteraction;
};

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

const chooser =
  (props: MenuProps) =>
  (index: number): void => {
    const option = props.options[index];

    if (option) props.selectOptionAndCleanUp(option);
  };

// Lexical's options as the menu takes them: rows highlighted from the field and chosen through Lexical.
function menuContent(
  props: MenuProps,
  onHighlight: (index: number) => void,
): Omit<SuggestionMenuProps, 'maxHeight'> {
  return {
    rows: props.options.map((option) => option.display),
    onChoose: chooser(props),
    listbox: {
      highlighted: props.selectedIndex,
      onHighlight,
    },
  };
}

function dismissOutside(
  element: HTMLElement,
  target: Node,
  dismiss: () => void,
): void {
  if (!element.contains(target)) dismiss();
}

function outsideHandler(
  menu: RefObject<HTMLDivElement | null>,
  dismiss: () => void,
): (event: PointerEvent) => void {
  return (event) => {
    const target = event.target;
    const element = menu.current;

    if (target instanceof Node && element)
      dismissOutside(element, target, dismiss);
  };
}

function dismissSuggestions(
  editor: LexicalEditor,
  interaction: TypeaheadInteraction,
): void {
  editor
    .getEditorState()
    .read(() => interaction.dismiss($getRoot().getTextContent()));
  editor.dispatchCommand(
    KEY_ESCAPE_COMMAND,
    new KeyboardEvent('keydown', { key: 'Escape' }),
  );
}

function useOutsideDismiss(
  menu: RefObject<HTMLDivElement | null>,
  interaction: TypeaheadInteraction,
): void {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const dismiss = outsideHandler(menu, () =>
      dismissSuggestions(editor, interaction),
    );

    document.addEventListener('pointerdown', dismiss);

    return (): void => document.removeEventListener('pointerdown', dismiss);
  }, [editor, menu, interaction]);
}

// The menu's surface above the field, and the height the window leaves it.
function useMenuSurface(
  anchor: HTMLElement,
  interaction: TypeaheadInteraction,
): MenuSurface {
  const menu = useRef<HTMLDivElement>(null);
  useKeepFocus(menu);
  useOutsideDismiss(menu, interaction);

  return { menu, maxHeight: useMenuMaxHeight(anchor, menu) };
}

const useHighlight = (props: MenuProps): ((index: number) => void) =>
  useGatedHighlight(props.options, props.setHighlightedIndex);

function TypeaheadMenu(props: TypeaheadMenuProps): React.JSX.Element {
  const { menu, maxHeight } = useMenuSurface(props.anchor, props.interaction);
  const content = menuContent(props, useHighlight(props));

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
export const renderTypeaheadMenu =
  (interaction: TypeaheadInteraction): MenuRenderFn<TypeaheadOption> =>
  (anchorRef, menu) => {
    const anchor = anchorRef.current;

    if (!anchor || !menu.options.length) return null;

    return createPortal(
      <TypeaheadMenu {...menu} anchor={anchor} interaction={interaction} />,
      anchor,
    );
  };
