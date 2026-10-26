import { Label, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { NativeText, useTextColor } from '#primitives/content/native-text';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { iosImage } from '../../../symbols/ios-image';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { RowLogo } from './field-row-logo';
import type { RowTextProps } from './field-row-text';

type RowTitleProps = RowTextProps & {
  title: string;
  subtitle?: string;
  subtitleTone?: 'warning';
};

/*
 * The title as SwiftUI draws it in a stock row: a plain Text, or a Label with its icon. A row is one line, a long title
 * truncated; its explanation goes in its Section's footer, as iOS Settings does. A picker option's subtitle goes in
 * the Label's title view, under the title.
 */
export function RowTitle(props: RowTitleProps): ReactElement {
  const icon = rowIcon(props);
  const tint = useDangerStyle(props.tone);
  const title = <TitleLines {...props} />;

  if (!icon) return title;

  return (
    <Label {...icon} modifiers={tint}>
      {title}
    </Label>
  );
}

// A logo is the Label's icon too, so its title starts where the other rows' titles do.
const rowIcon = (props: RowTitleProps): LabelIcon | undefined =>
  props.logo
    ? { icon: <RowLogo logo={props.logo} title={props.title} /> }
    : labelIcon(props);

// A subtitle as a stock row draws it: the secondary shade, one text style down, or the warning colour it asks for.
const subtitleModifiers = (
  warning: string | undefined,
): ReturnType<typeof font>[] => [
  font({ textStyle: 'subheadline' }),
  foregroundStyle(warning ?? { type: 'hierarchical', style: 'secondary' }),
];

// The Label's title view: the title and any subtitle under it, so the subtitle starts where the title does.
function TitleLines(props: RowTitleProps): ReactElement {
  const warning = useTextColor(props.subtitleTone);
  const title = <OneLine tone={props.tone}>{props.title}</OneLine>;

  if (!props.subtitle) return title;

  return (
    <VStack alignment="leading">
      {title}
      <NativeText modifiers={subtitleModifiers(warning)}>
        {props.subtitle}
      </NativeText>
    </VStack>
  );
}

// A row's title keeps to one line, truncating a long one.
const OneLine = (props: {
  tone: RowTextProps['tone'];
  children: string;
}): ReactElement => (
  <NativeText tone={props.tone} numberOfLines={1}>
    {props.children}
  </NativeText>
);

// A Label's title is a plain string, so the destructive tone colours the whole label.
function useDangerStyle(
  tone: RowTextProps['tone'],
): ReturnType<typeof foregroundStyle>[] {
  const color = useNativeTheme().colors.danger;

  return tone === 'danger' && color ? [foregroundStyle(color)] : [];
}

type LabelIcon = Pick<LabelProps, 'systemImage' | 'icon'>;

/*
 * A row's leading icon as the Label takes it: a system SF Symbol by name, Argo's own symbol (`custom.robot`, an
 * asset-catalog image) as the Label's icon view, at the size nearest the Label's body font so it matches a system
 * symbol. An SVG icon has no image, so the row draws none.
 */
function labelIcon(props: RowTextProps): LabelIcon | undefined {
  return props.leading ? iconView(props.leading) : undefined;
}

function iconView(leading: IconSymbol): LabelIcon | undefined {
  const image = iosImage(leading);

  if (!image) return undefined;

  return image.kind === 'system'
    ? { systemImage: image.name }
    : { icon: <NativeSymbol name={leading} /> };
}

type LabelProps = React.ComponentProps<typeof Label>;
