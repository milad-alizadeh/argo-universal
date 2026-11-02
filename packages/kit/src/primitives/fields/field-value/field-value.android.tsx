import { Box, Row, useMaterialColors } from '@expo/ui/jetpack-compose';
import {
  background,
  clip,
  fillMaxWidth,
  size,
  type ModifierConfig,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { toneClass } from '#primitives/content/text';
import { usePrimitiveColor } from '#primitives/native/primitive-color';
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';
import type { FieldValueProps } from './field-value-props';

type Props = FieldValueProps;

/*
 * The most of the row a value may take. A ListItem measures its trailing content first and gives the headline what is
 * left, so a long value (a path) would take the whole row and leave the title no width at all. The value takes at most
 * this share of the row, at its end, and the title keeps the rest.
 */
const valueShare = 0.6;

const valueModifiers = [fillMaxWidth(valueShare)];

// A Material 3 ListItem: title, leading icon, and the value as trailing text.
export function FieldValue(props: Props): ReactElement {
  if (props.loading) return <Placeholder {...props} />;

  return (
    <RowListItem {...rowListItemProps(props)} trailing={trailing(props)} />
  );
}

// An empty value has no trailing content: a ListItem gives it the width its Box asks for, whether or not it holds text, which would squeeze the title (a missing page's message). A value is one line that ends in an ellipsis (ADR-0042), so a path never wraps mid-word.
const trailing = ({ value, dot }: Props): ReactElement | undefined =>
  value ? (
    <Box contentAlignment="centerEnd" modifiers={valueModifiers}>
      <Row
        verticalAlignment="center"
        horizontalArrangement={{ spacedBy: dotGap }}
      >
        {dot && <Dot tone={dot} />}
        <NativeText tone="muted" numberOfLines={1}>
          {value}
        </NativeText>
      </Row>
    </Box>
  ) : undefined;

const dotGap = 6;

const dotSize = 8;

// A circle the size of a status dot, in the tone's colour.
function Dot(props: { tone: NonNullable<Props['dot']> }): ReactElement {
  const color = usePrimitiveColor(toneClass(props.tone) ?? 'text-foreground');

  return (
    <Box
      modifiers={[
        size(dotSize, dotSize),
        clip({ type: 'roundedCorner', radius: dotSize / 2 }),
        background(color ?? 'transparent'),
      ]}
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
