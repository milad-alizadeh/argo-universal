import type { ReactElement } from 'react';
import { List } from '#primitives/lists/list';
import { loadingRows, type LoadingRow } from '#primitives/lists/list-item';
import type { ComboboxOption, ComboboxProps } from './combobox-props';

/*
 * The choices as bars, drawn while the page carrying them slides in. A picker knows every row it is about
 * to draw before it opens, so this is the list at its own length and its own widths rather than a guess:
 * nothing moves when the rows themselves arrive, and the slide carries a page of the right shape.
 */
export function comboboxPlaceholder<Value extends string>(
  props: Pick<ComboboxProps<Value>, 'options' | 'label'>,
): ReactElement {
  return (
    <List appearance="grouped" accessibilityLabel={props.label}>
      <List.Section>
        {loadingRows(props.options.map(placeholderRow))}
      </List.Section>
    </List>
  );
}

const placeholderRow = (option: ComboboxOption<string>): LoadingRow => ({
  title: option.label,
  subtitle: option.subtitle,
  icon: option.icon !== undefined,
});
