import { Image, type ImageProps } from '@expo/ui/swift-ui';
import type * as React from 'react';
import { isCustomSymbol } from './custom-symbols';
import { type IconName, iconSymbols } from './icon-names';
import { type IconRole, useIconPixels } from './icon-role';

export interface SwiftUISymbolProps {
  name: IconName;
  role: IconRole;
  modifiers?: ImageProps['modifiers'];
}

// An Argo icon inside a SwiftUI tree, which cannot hold a React Native view: same name and role as Icon.
export function SwiftUISymbol({
  name,
  role,
  modifiers,
}: SwiftUISymbolProps): React.JSX.Element {
  const { sf } = iconSymbols[name];
  const source = isCustomSymbol(sf) ? { assetName: sf } : { systemName: sf };
  return <Image {...source} size={useIconPixels(role)} modifiers={modifiers} />;
}
