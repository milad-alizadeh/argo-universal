import type { ImageSourcePropType } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import { isCustomSymbol } from '#lib/generic/symbols/custom-symbols';
import { resolveIcon } from '#lib/generic/symbols/icon-symbol';
import { tablerAsset } from '#lib/generic/symbols/tabler-symbols';
import type { ActionProps } from '#primitives/actions/action-list';

export function pageToolbarIcon(
  icon: ActionProps['icon'],
): SFSymbol | ImageSourcePropType {
  const source = resolveIcon(icon).symbol;

  if ('tabler' in source) return { uri: tablerAsset(source.tabler) };

  if (isCustomSymbol(source.sf)) return { uri: source.sf };

  return source.sf;
}
