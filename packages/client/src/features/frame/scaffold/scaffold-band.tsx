import type { ReactElement } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { useSymbolImageRenderer } from '../../../lib/generic/symbols/symbol-images';
import type { ScaffoldPartProps } from './use-scaffold-layout';

export const bandControlAppearance = {
  variant: 'ghost',
  size: '2xs',
  iconRole: 'band',
  corners: 'control',
} as const;

const leadingWidths = { mac: 124, other: 44 };

const leadingInsets = { mac: 88, other: 8 };

function SidebarBandToggle({ scaffold }: ScaffoldPartProps): ReactElement {
  const label = scaffold.sidebarShown ? 'Hide sidebar' : 'Show sidebar';

  return (
    <IconButton
      {...bandControlAppearance}
      icon="sidebar"
      selected={scaffold.sidebarShown}
      accessibilityLabel={label}
      onPress={() => scaffold.onSidebarShownChange(!scaffold.sidebarShown)}
    />
  );
}

function BandLeading(parts: ScaffoldPartProps): ReactElement {
  const platform = useSymbolImageRenderer() ? 'mac' : 'other';

  const style = {
    width: leadingWidths[platform],
    paddingLeft: leadingInsets[platform],
  };

  return (
    <View
      className="shrink-0 flex-row items-center web:[app-region:no-drag]"
      style={style}
    >
      <SidebarBandToggle {...parts} />
    </View>
  );
}

export function ScaffoldBand(parts: ScaffoldPartProps): ReactElement {
  return (
    <View
      testID="window-band"
      className="absolute inset-x-0 top-0 z-50 flex-row items-center web:[app-region:drag]"
      style={{ height: parts.layout.frame.panesTop }}
    >
      <BandLeading {...parts} />
    </View>
  );
}
