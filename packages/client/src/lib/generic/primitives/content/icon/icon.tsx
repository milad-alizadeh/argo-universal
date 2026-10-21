import type * as React from 'react';
import { useContext } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { withUniwind } from 'uniwind';
import { cn } from '#lib/generic/utils';
import { TextClassContext, toneClass } from '#primitives/content/text';
import { StatusDot } from '#primitives/status/status-dot';
import { StatusMarkHidden } from '../../../status-mark-context';
import { type DrawnSymbol, drawnSymbol } from '../../../symbols/drawn-symbol';
import { useIconBox, useIconPixels } from '../../../symbols/icon-role';
import {
  type IconSymbol,
  type ResolvedIcon,
  resolveIcon,
} from '../../../symbols/icon-symbol';
import { LogoGlyph } from '../../../symbols/logo-glyph';
import type { LogoSource } from '../../../symbols/logo-source';
import { SymbolGlyph } from '../../../symbols/symbol-glyph/symbol-glyph';
import type { IconProps, IconSlotProps, IconSpinnerProps } from './icon-props';
import { useSlotIconRole } from './icon-role-context';

// Material's font em includes more whitespace; normalize its drawing without changing the layout slot.
const materialGlyphScale = 1.125;

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

const glyphScale = Platform.OS === 'android' ? materialGlyphScale : 1;

const iconDrawing = (
  { symbol, materialFill }: ResolvedIcon,
  filled: boolean | undefined,
): DrawnSymbol => drawnSymbol(symbol, filled, materialFill);

function useIconColor(props: Pick<IconProps, 'tone' | 'className'>): string {
  return cn(
    'text-foreground',
    useContext(TextClassContext),
    toneClass(props.tone),
    props.className,
  );
}

export function Icon(slotted: IconProps): React.JSX.Element {
  const props = { ...slotted, role: useSlotIconRole(slotted.role) };
  const glyph = <IconGlyph {...props} />;

  const hidden = useContext(StatusMarkHidden);

  if (!props.status || hidden) return glyph;

  return (
    <IconWithStatus {...props} status={props.status}>
      {glyph}
    </IconWithStatus>
  );
}

type LogoIconProps = IconProps & { source: LogoSource };

type SymbolIconProps = IconProps & { name: IconSymbol };

function IconGlyph(props: IconProps): React.JSX.Element {
  if (props.source) return <IconLogo {...props} source={props.source} />;

  return <IconSymbolGlyph {...props} name={props.name} />;
}

// Logos are SVG assets rather than symbols (ADR-0019, Logos).
function IconLogo(props: LogoIconProps): React.JSX.Element {
  return (
    <LogoGlyph
      source={props.source}
      pixels={useIconPixels(props.role)}
      colorClassName={useIconColor(props)}
      testID={props.testID ?? `icon-${props.source.label.toLowerCase()}`}
    />
  );
}

function IconSymbolGlyph(props: SymbolIconProps): React.JSX.Element {
  const colorClassName = useIconColor(props);
  const icon = resolveIcon(props.name);

  return (
    <TintedSymbol
      className={colorClassName}
      {...useSymbolDrawingProps(props, icon, colorClassName)}
    />
  );
}

function useSymbolDrawingProps(
  props: SymbolIconProps,
  icon: ResolvedIcon,
  colorClassName: string,
): React.ComponentProps<typeof TintedSymbol> {
  return {
    symbol: iconDrawing(icon, props.filled),
    colorClassName,
    pixels: useIconPixels(props.role),
    glyphScale,
    fitArtwork: props.fitArtwork,
    weight: props.weight,
    testID: props.testID ?? `icon-${icon.key}`,
  };
}

function IconWithStatus(
  props: IconProps & {
    status: NonNullable<IconProps['status']>;
    children: React.ReactElement;
  },
): React.JSX.Element {
  return (
    <View style={useIconBox(props.role)} className="relative">
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

export function IconSpinner({
  iconRole,
  ...props
}: IconSpinnerProps): React.JSX.Element {
  return <ActivityIndicator {...props} size={useIconPixels(iconRole)} />;
}

export function IconSlot({
  role,
  className,
  ...props
}: IconSlotProps): React.JSX.Element {
  return (
    <View
      {...props}
      style={useIconBox(role)}
      className={cn('shrink-0 items-center justify-center', className)}
    />
  );
}
