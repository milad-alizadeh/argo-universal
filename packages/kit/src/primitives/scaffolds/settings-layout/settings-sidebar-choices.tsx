import { isStockIconName } from '@repo/contracts/kit-symbols';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '#kit/flattened-children';
import { Icon } from '#primitives/content/icon';
import {
  FieldGroup,
  type FieldGroupSectionProps,
} from '#primitives/fields/field-group';
import type {
  FieldPickerCallerProps,
  FieldPickerSingle,
} from '#primitives/fields/field-picker';
import { ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Menu } from '#primitives/overlays/menu';

/*
 * The wide web sidebar draws a last section of single-choice Pickers as one more group of its rows: each row shows its
 * choice and opens the menu of options, so Theme reads as part of the list above it. Any other last section is undefined.
 */
export function sidebarChoices(section: ReactNode): ReactElement | undefined {
  if (!isSection(section)) return undefined;

  const rows = flattenedChildren(section.props.children);

  if (!rows.every(isSinglePicker)) return undefined;

  return (
    <ListSection title={section.props.title}>
      {rows.map((row) => (
        <ChoiceRow key={row.key} {...row.props} />
      ))}
    </ListSection>
  );
}

const isSection = (
  node: ReactNode,
): node is ReactElement<FieldGroupSectionProps> =>
  isValidElement(node) && node.type === FieldGroup.Section;

const isSinglePicker = (
  node: ReactNode,
): node is ReactElement<FieldPickerSingle> =>
  isValidElement<FieldPickerCallerProps>(node) &&
  node.type === FieldGroup.Picker &&
  node.props.multiple !== true;

const ChoiceRow = (props: FieldPickerSingle): ReactElement => (
  <Menu
    accessibilityLabel={props.title}
    disabled={props.disabled}
    value={props.value}
    options={props.options}
    onValueChange={props.onValueChange}
    trigger={choiceTrigger(props)}
  />
);

/*
 * The row names the Picker and shows its choice; the menu's trigger hands it its press, so it is a button. It is the
 * ListItem element itself, not a component around one, so the trigger's handlers and ref reach the row.
 */
function choiceTrigger(props: FieldPickerSingle): ReactElement {
  const chosen = props.options.find((option) => option.value === props.value);

  return (
    <ListItem
      role="button"
      accessibilityLabel={props.title}
      title={props.title}
      leading={leadingIcon(props.leading)}
      value={chosen?.label}
      trailing={<Icon name="chevron-up-down" className="text-tertiary" />}
      disabled={props.disabled}
    />
  );
}

const leadingIcon = (icon: FieldPickerSingle['leading']): ReactNode =>
  icon && isStockIconName(icon) ? <Icon name={icon} /> : undefined;
