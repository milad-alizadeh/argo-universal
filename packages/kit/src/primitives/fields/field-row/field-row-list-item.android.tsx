import { Icon, ListItem, useMaterialColors } from '@expo/ui/jetpack-compose';
import {
  clip,
  fillMaxWidth,
  Shapes,
  toggleable,
  type ModifierConfig,
} from '@expo/ui/jetpack-compose/modifiers';
import { type ReactElement, type ReactNode, useContext } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { useEnlargedText } from '#kit/enlarged-text';
import { NativeText } from '#primitives/content/native-text';
import { drawnSymbol } from '../../../symbols/drawn-symbol';
import { useIconPixels } from '../../../symbols/icon-size';
import { resolveIcon } from '../../../symbols/icon-symbol';
import { nativeIconName } from '../../../symbols/native-icon-name';
import { rowGlyphSize } from '../../../symbols/row-glyph';
import { useRowGlyphColor } from '../../../symbols/row-glyph-color';
import { svgDrawing } from '../../../symbols/svg-drawings.android';
import { RowLogo } from './field-row-logo';
import {
  cornerRadii,
  PositionContext,
  RowLongPressContext,
} from './field-row-position';
import { dimming, pressing, useDisabled } from './field-row-pressing.android';
import type { RowTextProps } from './field-row-text';

export type RowListItemProps = Pick<
  RowTextProps,
  'leading' | 'logo' | 'tone'
> & {
  title: string;
  // What sits under the title: a Slider, or a text row's value as EditTextPreference shows it.
  supporting?: ReactNode;
  headline?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  modifiers?: ModifierConfig[];
};

/*
 * One FieldGroup row as itself: a Material 3 ListItem with headline, supporting, leading and trailing content,
 * on Expo's surfaceContainer and clipped to its position in the section. Expo's own Section wraps the row in a
 * ListItem headline instead (expo/expo#50086).
 */
export function RowListItem(props: RowListItemProps): ReactElement {
  return (
    <ListItem
      colors={{ containerColor: useMaterialColors().surfaceContainer }}
      modifiers={useRowModifiers(props)}
    >
      <ListItem.HeadlineContent>
        <Headline {...props} />
      </ListItem.HeadlineContent>
      <SupportingSlot supporting={props.supporting} />
      <LeadingSlot {...props} />
      <TrailingSlot trailing={props.trailing} />
    </ListItem>
  );
}

// One line, truncating a long title, until the text is enlarged; then it wraps.
function Headline(props: RowListItemProps): ReactNode {
  const lines = useEnlargedText() ? undefined : 1;

  return (
    props.headline ?? (
      <NativeText tone={props.tone} numberOfLines={lines}>
        {props.title}
      </NativeText>
    )
  );
}

function useRowModifiers(props: RowListItemProps): ModifierConfig[] {
  const corner = Shapes.RoundedCorner(cornerRadii(useContext(PositionContext)));
  const off = useDisabled(props.disabled);
  const longPress = useContext(RowLongPressContext);

  return [
    fillMaxWidth(),
    clip(corner),
    ...dimming(off),
    ...pressing(props, off, longPress),
    ...(props.modifiers ?? []),
  ];
}

function SupportingSlot(
  props: Pick<RowListItemProps, 'supporting'>,
): ReactNode {
  if (!props.supporting) return null;

  return (
    <ListItem.SupportingContent>{props.supporting}</ListItem.SupportingContent>
  );
}

function TrailingSlot(props: Pick<RowListItemProps, 'trailing'>): ReactNode {
  if (!props.trailing) return null;

  return <ListItem.TrailingContent>{props.trailing}</ListItem.TrailingContent>;
}

function LeadingSlot(
  props: Pick<RowTextProps, 'leading' | 'logo' | 'tone'> & { title: string },
): ReactNode {
  if (props.logo)
    return (
      <ListItem.LeadingContent>
        <RowLogo logo={props.logo} title={props.title} />
      </ListItem.LeadingContent>
    );

  return <IconSlot leading={props.leading} tone={props.tone} />;
}

/*
 * The row glyph rule: one size by role, in the glyph token rather than the ListItem's own content colour, so a
 * Settings row and a kit ListItem row read the same in light mode and in Graphite (row-glyph.ts).
 */
function IconSlot(props: Pick<RowTextProps, 'leading' | 'tone'>): ReactNode {
  const source = leadingSource(props.leading);
  const size = useIconPixels(rowGlyphSize);
  const tint = useRowGlyphColor(props.tone);

  if (!source) return null;

  return (
    <ListItem.LeadingContent>
      <Icon source={source} size={size} tint={tint} />
    </ListItem.LeadingContent>
  );
}

// The Android drawing of a leading icon: Material's XML, or the vector drawable of an SVG icon (ADR-0041); a name with none, or an SF Symbol name, draws nothing.
function leadingSource(
  leading: RowTextProps['leading'],
): ImageSourcePropType | undefined {
  const name = leading ? drawingOf(leading) : undefined;

  return isDrawing(name) ? name : undefined;
}

const drawingOf = (leading: NonNullable<RowTextProps['leading']>): IconName =>
  nativeIconName(leading) ?? svgSource(leading);

function svgSource(
  leading: NonNullable<RowTextProps['leading']>,
): ImageSourcePropType | undefined {
  const { symbol, materialFill } = resolveIcon(leading);
  const drawn = drawnSymbol(symbol, false, materialFill);

  return drawn.kind === 'svg' ? svgDrawing(drawn.svg) : undefined;
}

type IconName = ReturnType<typeof nativeIconName>;

const isPair = (name: IconName): boolean =>
  typeof name === 'object' && name !== null && 'ios' in name;

const isDrawing = (name: IconName): name is ImageSourcePropType =>
  name !== undefined && typeof name !== 'string' && !isPair(name);

type RowTitleProps = Pick<RowListItemProps, 'title' | 'leading' | 'disabled'>;

// What every row but a Button passes the ListItem: its title and icon.
export const rowListItemProps = (props: RowTitleProps): RowListItemProps => ({
  title: props.title,
  leading: props.leading,
  disabled: props.disabled,
});

type Toggling = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

// The whole row toggles, as Expo's labelled Switch and Checkbox do.
export const toggling = (
  props: Toggling,
  role: 'switch' | 'checkbox' | 'radioButton',
): ModifierConfig[] => [
  toggleable(props.value, () => props.onValueChange(!props.value), {
    role,
    enabled: !props.disabled,
  }),
];
