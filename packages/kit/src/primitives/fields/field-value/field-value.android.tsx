import { Box, useMaterialColors } from '@expo/ui/jetpack-compose';
import {
  background,
  clip,
  size,
  type ModifierConfig,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import type { FieldGroupKitProps } from '../../kit-props';
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';

type Props = FieldGroupKitProps<'FieldGroup.Value'>;

// A Material 3 ListItem: title, leading icon, and the value as trailing text.
export function FieldValue(props: Props): ReactElement {
  if (props.loading) return <Placeholder {...props} />;

  return (
    <RowListItem
      {...rowListItemProps(props)}
      trailing={<NativeText tone="muted">{props.value}</NativeText>}
    />
  );
}

// The width a title's letter takes, which sets how long the bar standing in for it is.
const barPerCharacter = 8;

const barHeight = 12;

const barRadius = 6;

const barModifiers = (title: string, color: string): ModifierConfig[] => [
  size(title.length * barPerCharacter, barHeight),
  clip({ type: 'roundedCorner', radius: barRadius }),
  background(color),
];

// A bar as wide as the title it stands in for, in the outline's tone; the row keeps its height.
function Placeholder(props: Props): ReactElement {
  const color = useMaterialColors().outlineVariant;

  return (
    <RowListItem
      title={props.title}
      headline={<Box modifiers={barModifiers(props.title, color)} />}
    />
  );
}
