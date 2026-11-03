import type * as React from 'react';
import { useContext } from 'react';
import { Platform, View } from 'react-native';
import { withUniwind } from 'uniwind';
import { cn } from '#kit/utils';
import { TextClassContext, toneClass } from '#primitives/content/text';
import { StatusDot } from '#primitives/status/status-dot';
import { StatusMarkHidden } from '../../../status-mark-context';
import { type DrawnSymbol, drawnSymbol } from '../../../symbols/drawn-symbol';
import {
  type IconSizeValue,
  useIconBox,
  useIconPixels,
} from '../../../symbols/icon-size';
import {
  type IconSymbol,
  type ResolvedIcon,
  resolveIcon,
} from '../../../symbols/icon-symbol';
import { LogoGlyph } from '../../../symbols/logo-glyph';
import type { LogoSource } from '../../../symbols/logo-source';
import { glyphForegroundClass } from '../../../symbols/row-glyph';
import { SymbolGlyph } from '../../../symbols/symbol-glyph/symbol-glyph';
import type { IconProps } from './icon-props';
import { useIconLane, useIconSize } from './icon-size-context';

// Web colours the glyph with CSS from `colorClassName`, so only native resolves the class to a tint, which costs a style lookup each render on web.
const TintedSymbol =
  Platform.OS === 'web'
    ? SymbolGlyph
    : withUniwind(SymbolGlyph, {
        tintColor: {
          fromClassName: 'className',
          styleProperty: 'color',
        },
      });

const iconDrawing = (
  { symbol, materialFill }: ResolvedIcon,
  filled: boolean | undefined,
): DrawnSymbol => drawnSymbol(symbol, filled, materialFill);

function useIconColor(props: Pick<IconProps, 'tone' | 'className'>): string {
  return cn(
    glyphForegroundClass,
    useContext(TextClassContext),
    toneClass(props.tone),
    props.className,
  );
}

export function Icon(slotted: IconProps): React.JSX.Element {
  const props = { ...slotted, size: useIconSize(slotted.size) };
  const glyph = iconGlyph(props, useGlyphDrawing(props));

  const hidden = useContext(StatusMarkHidden);

  if (!props.status || hidden) return glyph;

  return (
    <IconWithStatus {...props} status={props.status}>
      {glyph}
    </IconWithStatus>
  );
}

// An icon whose size its surrounding control has settled.
type Sized<P> = P & { size: IconSizeValue };

type LogoIconProps = Sized<IconProps> & { source: LogoSource };

type SymbolIconProps = Sized<IconProps> & { name: IconSymbol };

// What every glyph draws with: its colour classes, its pixels, and the lane it sits in.
interface GlyphDrawing {
  colorClassName: string;
  pixels: number;
  lane: ReturnType<typeof useIconLane>;
}

function useGlyphDrawing(props: Sized<IconProps>): GlyphDrawing {
  return {
    colorClassName: useIconColor(props),
    pixels: useIconPixels(props.size),
    // A row's leading lane draws its glyph at what the platform's Settings app draws (row-glyph.ts).
    lane: useIconLane(),
  };
}

// A logo or a symbol, drawn by Icon itself rather than a component of its own, so the icon is no deeper than its glyph.
function iconGlyph(
  props: Sized<IconProps>,
  drawing: GlyphDrawing,
): React.JSX.Element {
  if (props.source)
    return logoGlyph({ ...props, source: props.source }, drawing);

  return symbolGlyph({ ...props, name: props.name }, drawing);
}

// Logos are SVG assets rather than symbols (ADR-0019, Logos).
const logoGlyph = (
  props: LogoIconProps,
  { pixels, colorClassName }: GlyphDrawing,
): React.JSX.Element => (
  <LogoGlyph
    source={props.source}
    pixels={pixels}
    colorClassName={colorClassName}
    testID={props.testID ?? `icon-${props.source.label.toLowerCase()}`}
  />
);

function symbolGlyph(
  props: SymbolIconProps,
  drawing: GlyphDrawing,
): React.JSX.Element {
  const icon = resolveIcon(props.name);

  return (
    <TintedSymbol
      className={drawing.colorClassName}
      {...drawing}
      symbol={iconDrawing(icon, props.filled)}
      testID={props.testID ?? `icon-${icon.key}`}
    />
  );
}

function IconWithStatus(
  props: Sized<IconProps> & {
    status: NonNullable<IconProps['status']>;
    children: React.ReactElement;
  },
): React.JSX.Element {
  return (
    <View style={useIconBox(props.size)} className="relative">
      {props.children}
      <IconStatus status={props.status} testID={props.testID} />
    </View>
  );
}

function IconStatus(
  props: Pick<IconProps, 'status' | 'testID'> & {
    status: NonNullable<IconProps['status']>;
  },
): React.JSX.Element {
  return (
    <View className="absolute -right-0.5 -top-0.5 rounded-full border-2 border-card bg-card">
      <StatusDot {...iconStatusDotProps(props)} />
    </View>
  );
}

function iconStatusDotProps(
  props: Pick<IconProps, 'status' | 'testID'> & {
    status: NonNullable<IconProps['status']>;
  },
): React.ComponentProps<typeof StatusDot> {
  return {
    tone: props.status.tone,
    pulse: props.status.pulse,
    testID: props.testID ? `${props.testID}-${props.status.tone}` : undefined,
  };
}
