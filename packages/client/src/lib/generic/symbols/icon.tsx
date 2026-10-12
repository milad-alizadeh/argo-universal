import type * as React from 'react';
import { type ReactNode, useContext } from 'react';
import {
  ActivityIndicator,
  type ActivityIndicatorProps,
  Platform,
  View,
} from 'react-native';
import { withUniwind } from 'uniwind';
import { TextClassContext } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { type IconName, iconSymbols } from './icon-names';
import { type IconRole, useIconBox, useIconPixels } from './icon-role';
import type { NativeSymbol } from './native-symbol';
import { SymbolGlyph } from './symbol-glyph/symbol-glyph';

// Material's font em includes more whitespace; normalize its drawing without changing the layout slot.
const materialGlyphScale = 1.125;

export interface IconProps {
  name: IconName;
  role: IconRole;
  // Selects the platform's filled variant where the icon has one.
  filled?: boolean;
  className?: string;
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

export function Icon({
  name,
  role,
  filled = false,
  className,
  testID = `icon-${name}`,
}: IconProps): React.JSX.Element {
  const textClass = useContext(TextClassContext);
  const symbol: NativeSymbol = iconSymbols[name];
  const colorClassName = cn('text-foreground', textClass, className);
  const pixels = useIconPixels(role);
  const sf = (filled && symbol.sfFilled) || symbol.sf;
  return (
    <TintedSymbol
      className={colorClassName}
      colorClassName={colorClassName}
      sf={sf}
      material={symbol.material}
      filled={sf !== symbol.sf || sf.endsWith('.fill')}
      pixels={pixels}
      glyphScale={Platform.OS === 'android' ? materialGlyphScale : 1}
      testID={testID}
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

// A box the size of an icon in that role, for a spinner, a status dot or an image that stands in for the icon.
export function IconSlot({
  role,
  className,
  children,
}: {
  role: IconRole;
  className?: string;
  children?: ReactNode;
}): React.JSX.Element {
  return (
    <View style={useIconBox(role)} className={className}>
      {children}
    </View>
  );
}

export type { IconRole } from './icon-role';
