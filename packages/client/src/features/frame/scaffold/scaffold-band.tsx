import type { ReactElement } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { useSymbolImageRenderer } from '../../../lib/generic/symbols/symbol-images';
import { bandControlAppearance } from './band-control-appearance';
import { BandTrailing } from './scaffold-band-controls';
import { BandTitle } from './scaffold-band-title';
import type { ScaffoldPartProps } from './use-scaffold-layout';

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

function BandLeading({
  platform,
  ...parts
}: ScaffoldPartProps & { platform: keyof typeof leadingWidths }): ReactElement {
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
  const platform = useSymbolImageRenderer() ? 'mac' : 'other';

  return (
    <View
      testID="window-band"
      className="absolute inset-x-0 top-0 z-50 flex-row items-center web:[app-region:drag]"
      style={{ height: parts.layout.frame.panesTop }}
    >
      <BandLeading {...parts} platform={platform} />
      <BandTitle {...parts} leadingWidth={leadingWidths[platform]} />
      <BandTrailing {...parts} />
    </View>
  );
}
