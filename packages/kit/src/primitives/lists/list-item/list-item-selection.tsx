import { useContext, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { Spinner } from '#primitives/status/spinner';
import {
  ListSelectionContext,
  type ListSelection,
} from '../../../list-context';
import { ChoiceMark } from './list-item-choice-mark';
import { LinkAccessory } from './list-item-parts';
import type { ListItemProps } from './list-item-props';
import { selectionTint } from './list-item-styles';

function toggleSelection(id: string, current: readonly string[]): string[] {
  return current.includes(id)
    ? current.filter((key) => key !== id)
    : [...current, id];
}

function nextSelection(id: string, context: ListSelection): string[] {
  if (context.selectionMode === 'single') return [id];

  return toggleSelection(id, context.selection ?? []);
}

function select(id: string, context: ListSelection): void {
  context.onSelectionChange?.(nextSelection(id, context));
}

function controlledSelection(
  props: ListItemProps,
  id: string,
  context: ListSelection,
): ListItemProps {
  if (!context.onSelectionChange) return props;

  return {
    ...props,
    selected: (context.selection ?? []).includes(id),
    onPress: () => select(id, context),
  };
}

export function useItemSelection(props: ListItemProps): ListItemProps {
  const context = useContext(ListSelectionContext);

  return props.id === undefined
    ? props
    : controlledSelection(props, props.id, context);
}

function ChoiceAccessory(props: ListItemProps): ReactNode {
  const { selectionMode } = useContext(ListSelectionContext);

  if (!selectionMode) return null;

  return pendingMark(props) ?? choiceMark(props, selectionMode);
}

const applyingLabel = 'Applying';

// A choice that has been made and not taken effect yet stands where its mark will be.
const pendingMark = (props: ListItemProps): ReactNode =>
  props.pending ? <Spinner accessibilityLabel={applyingLabel} /> : undefined;

function choiceMark(
  props: ListItemProps,
  mode: ListSelection['selectionMode'],
): ReactNode {
  return <ChoiceMark {...props} multiple={mode === 'multiple'} />;
}

// Paper's Combobox master: a menu row in a choice list keeps a leading slot for its check, so labels align.
export function ChoiceSlot(props: ListItemProps): ReactNode {
  const { selectionMode } = useContext(ListSelectionContext);

  if (!selectionMode) return null;

  return (
    <View className="h-5 w-4 shrink-0 items-center justify-center">
      {pendingMark(props) ?? <ChoiceMark {...props} />}
    </View>
  );
}

// A row that pushes a page outside a choosing List shows the disclosure chevron.
export const disclosureAccessory = (
  disclosure?: boolean,
): ReactElement | undefined => (disclosure ? <LinkAccessory /> : undefined);

// An empty trailing choice would hold the trailing lane off the row's edge.
export function useTrailingChoice(
  menu: boolean,
  selected: ListItemProps,
): ReactElement | undefined {
  const { selectionMode } = useContext(ListSelectionContext);

  if (menu || !selectionMode) return undefined;

  return <ChoiceAccessory {...selected} />;
}

type TintProps = Pick<ListItemProps, 'selected' | 'role'> & { menu: boolean };

// A menu's chosen row shows its check, not a tint; a listbox's highlighted option is tinted.
const tintedHere = ({ menu, role }: TintProps): boolean =>
  !menu || role === 'option';

const tinted = (
  props: TintProps,
  mode: ListSelection['selectionMode'],
): boolean => props.selected === true && !mode && tintedHere(props);

export function SelectionTint(props: TintProps): ReactNode {
  const { selectionMode } = useContext(ListSelectionContext);

  if (!tinted(props, selectionMode)) return null;

  return <View pointerEvents="none" aria-hidden className={selectionTint} />;
}
