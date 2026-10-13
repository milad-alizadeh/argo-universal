import type * as React from 'react';
import { useContext } from 'react';
import {
  ActivityIndicator,
  type ActivityIndicatorProps,
  Platform,
  View,
  type ViewProps,
} from 'react-native';
import { withUniwind } from 'uniwind';
import { TextClassContext } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { appleSymbol } from './apple-symbol';
import { type IconName, iconSymbols } from './icon-names';
import { type IconRole, useIconBox, useIconPixels } from './icon-role';
import {
  SymbolGlyph,
  type SymbolGlyphProps,
} from './symbol-glyph/symbol-glyph';
import type { SymbolSource } from './symbol-source';

// Material's font em includes more whitespace; normalize its drawing without changing the layout slot.
const materialGlyphScale = 1.125;

export interface IconProps {
  name: IconName;
  role: IconRole;
  // Selects the platform's filled variant where the icon has one.
  filled?: boolean;
  className?: string;
  weight?: SymbolGlyphProps['weight'];
  testID?: string;
}

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

function symbolGlyph(
  name: IconName,
  filled: boolean | undefined,
): Pick<SymbolGlyphProps, 'sf' | 'material' | 'filled'> {
  const symbol: SymbolSource = iconSymbols[name];
  const sf = appleSymbol(symbol, filled);

  return {
    sf,
    material: symbol.material,
    filled: sf !== symbol.sf || sf.endsWith('.fill'),
  };
}

function useIconColor(className: string | undefined): string {
  return cn('text-foreground', useContext(TextClassContext), className);
}

export function Icon(props: IconProps): React.JSX.Element {
  const colorClassName = useIconColor(props.className);

  return (
    <TintedSymbol
      {...symbolGlyph(props.name, props.filled)}
      className={colorClassName}
      colorClassName={colorClassName}
      pixels={useIconPixels(props.role)}
      glyphScale={glyphScale}
      weight={props.weight}
      testID={props.testID ?? `icon-${props.name}`}
    />
  );
}

// `role` stays the spinner's accessibility role, so its size takes `iconRole`.
export function IconSpinner({
  iconRole,
  ...props
}: Omit<ActivityIndicatorProps, 'size'> & {
  iconRole: IconRole;
}): React.JSX.Element {
  return <ActivityIndicator {...props} size={useIconPixels(iconRole)} />;
}

// A box the size of an icon in that role, its content centred: a spinner, a status ring, or an icon hosted in a native tree.
export function IconSlot({
  role,
  className,
  ...props
}: Omit<ViewProps, 'role'> & { role: IconRole }): React.JSX.Element {
  return (
    <View
      {...props}
      style={useIconBox(role)}
      className={cn('shrink-0 items-center justify-center', className)}
    />
  );
}
