import type * as React from 'react';
import { useContext } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { withUniwind } from 'uniwind';
import { cn } from '#lib/generic/utils';
import { TextClassContext, toneClass } from '#primitives/display/text';
import { appleSymbol } from '../../../symbols/apple-symbol';
import { useIconBox, useIconPixels } from '../../../symbols/icon-role';
import { type ResolvedIcon, resolveIcon } from '../../../symbols/icon-symbol';
import {
  SymbolGlyph,
  type SymbolGlyphProps,
} from '../../../symbols/symbol-glyph/symbol-glyph';
import type { IconProps, IconSlotProps, IconSpinnerProps } from './icon-props';

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

type GlyphNames = Pick<SymbolGlyphProps, 'sf' | 'material' | 'filled'>;

function symbolGlyph(
  { symbol, materialFill }: ResolvedIcon,
  filled: boolean | undefined,
): GlyphNames {
  const sf = appleSymbol(symbol, filled);

  return {
    sf,
    material: symbol.material,
    filled: materialFill && (sf !== symbol.sf || sf.endsWith('.fill')),
  };
}

function useIconColor(props: Pick<IconProps, 'tone' | 'className'>): string {
  return cn(
    'text-foreground',
    useContext(TextClassContext),
    toneClass(props.tone),
    props.className,
  );
}

export function Icon(props: IconProps): React.JSX.Element {
  const colorClassName = useIconColor(props);
  const icon = resolveIcon(props.name);

  return (
    <TintedSymbol
      {...symbolGlyph(icon, props.filled)}
      className={colorClassName}
      colorClassName={colorClassName}
      pixels={useIconPixels(props.role)}
      glyphScale={glyphScale}
      weight={props.weight}
      testID={props.testID ?? `icon-${icon.key}`}
    />
  );
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
