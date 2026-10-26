import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { useSymbolImageRenderer } from '@repo/kit/symbols/symbol-images';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { bandToggleAppearance } from './band-control-appearance';
import { BandTrailing } from './scaffold-band-controls';
import { BandTitle } from './scaffold-band-title';
import type { ScaffoldPartProps } from './use-scaffold-layout';

const leadingWidths = { mac: 124, other: 44 };

const leadingInsets = { mac: 88, other: 8 };

function SidebarBandToggle({ layout }: ScaffoldPartProps): ReactElement {
  const shown = !layout.frame.listFolded;

  return (
    <IconButton
      {...bandToggleAppearance(shown)}
      icon="sidebar"
      accessibilityLabel={shown ? 'Hide sidebar' : 'Show sidebar'}
      disabled={!shown && !layout.frame.sidebarAvailable}
      onPress={() => layout.requestSidebar(!shown)}
    />
  );
}

const sidebarControl = (parts: ScaffoldPartProps): ReactElement | null =>
  parts.scaffold.list ? <SidebarBandToggle {...parts} /> : null;

type BandLeadingProps = ScaffoldPartProps & {
  platform: keyof typeof leadingWidths;
};

function BandLeading({ platform, ...parts }: BandLeadingProps): ReactElement {
  const style = {
    width: leadingWidths[platform],
    paddingLeft: leadingInsets[platform],
  };

  return (
    <View
      className="shrink-0 flex-row items-center web:[app-region:no-drag]"
      style={style}
    >
      {sidebarControl(parts)}
    </View>
  );
}

export function ScaffoldBand(parts: ScaffoldPartProps): ReactElement {
  const platform = useSymbolImageRenderer() ? 'mac' : 'other';

  return (
    <View
      testID="window-band"
      className="absolute inset-x-0 top-0 z-50 flex-row items-center web:[app-region:drag]"
      style={{ top: parts.layout.safeTop, height: parts.layout.frame.panesTop }}
    >
      <BandLeading {...parts} platform={platform} />
      <BandTitle {...parts} leadingWidth={leadingWidths[platform]} />
      <BandTrailing {...parts} />
    </View>
  );
}
