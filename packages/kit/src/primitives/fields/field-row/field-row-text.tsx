import { Column, Row } from '@expo/ui';
import type { ReactElement, ReactNode } from 'react';
import { AgentLogo } from '#primitives/content/agent-logo';
import { IconSlot } from '#primitives/content/icon';
import { NativeText } from '#primitives/content/native-text';
import type { Tone } from '#primitives/content/text';
import { rowGlyphSize } from '../../../symbols/row-glyph';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { NativeIcon } from '../../../symbols/native-icon';
import { useRowGlyphColor } from '../../../symbols/row-glyph-color';

// What every row but a Button shares with Expo UI's universal ListItem: an icon before the title.
export type RowTextProps = {
  // A stock icon of a row, or any icon of a picker option.
  leading?: IconSymbol;
  // A picker option's logo (SVG markup or an image URI), drawn where the platform can hold an image in the row.
  logo?: string;
  // `danger` draws the title in the destructive tone.
  tone?: Tone;
};

// The gap between a leading icon and its title, as the Drawer's rows keep it.
const iconGap = 12;

/*
 * The web draws Expo UI's universal components, which have no place for a leading icon, so it sits beside the
 * title, centred on its line as Expo's ListItem lays them out. The title takes the kit's body role.
 */
type RowTitleProps = RowTextProps & {
  title: string;
  numberOfLines?: number;
  // A line under the title, such as a picker option's description, starting where the title starts.
  subtitle?: string;
  subtitleTone?: 'warning';
};

export function RowTitle(props: RowTitleProps): ReactNode {
  const title = <TitleLines {...props} />;

  if (!props.leading && !props.logo) return title;

  return (
    <Row alignment={iconAlignment(props)} spacing={iconGap}>
      <Mark {...props} />
      {title}
    </Row>
  );
}

// With a subtitle the icon keeps to the title's line, so the subtitle sits under the title, not the icon.
const iconAlignment = (props: RowTitleProps): 'start' | 'center' =>
  props.subtitle ? 'start' : 'center';

// The gap between a title and its subtitle, as a ListItem keeps it.
const subtitleGap = 2;

function TitleLines(props: RowTitleProps): ReactElement {
  if (!props.subtitle) return <Title {...props} />;

  return (
    <Column spacing={subtitleGap}>
      <Title {...props} />
      <NativeText role="secondary" tone={props.subtitleTone ?? 'muted'}>
        {props.subtitle}
      </NativeText>
    </Column>
  );
}

function Title(props: RowTitleProps): ReactElement {
  return (
    <NativeText numberOfLines={props.numberOfLines ?? 1} tone={props.tone}>
      {props.title}
    </NativeText>
  );
}

// The option's logo where it has one, its icon otherwise.
function Mark(props: RowTextProps & { title: string }): ReactElement {
  return props.logo ? (
    <LogoMark logo={props.logo} title={props.title} />
  ) : (
    <LeadingIcon leading={props.leading} tone={props.tone} />
  );
}

function LogoMark(props: { logo: string; title: string }): ReactElement {
  return (
    <IconSlot size={rowGlyphSize}>
      <AgentLogo logo={props.logo} label={props.title} size={rowGlyphSize} />
    </IconSlot>
  );
}

// The row glyph rule: one size by role, in the glyph token, the same as a kit ListItem's leading icon (row-glyph.ts).
function LeadingIcon(
  props: Pick<RowTextProps, 'leading' | 'tone'>,
): ReactElement | null {
  const color = useRowGlyphColor(props.tone);

  if (!props.leading) return null;

  return (
    <IconSlot size={rowGlyphSize}>
      <NativeIcon name={props.leading} size={rowGlyphSize} color={color} />
    </IconSlot>
  );
}
