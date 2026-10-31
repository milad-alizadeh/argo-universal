import {
  FixedSizeChrome,
  IconButton,
} from '@repo/kit/primitives/actions/icon-button';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { bandToggleAppearance } from './band-control-appearance';
import { BandTrailing } from './scaffold-band-controls';
import { BandTitle } from './scaffold-band-title';
import type {
  PartReads,
  ScaffoldLayout,
  ScaffoldPartProps,
} from './use-scaffold-layout';

interface SidebarToggleProps {
  layout: Pick<ScaffoldLayout, 'list' | 'requestSidebar'>;
}

function SidebarBandToggle({ layout }: SidebarToggleProps): ReactElement {
  const shown = !layout.list.folded;

  return (
    <IconButton
      {...bandToggleAppearance(shown)}
      icon="sidebar"
      accessibilityLabel={shown ? 'Hide sidebar' : 'Show sidebar'}
      disabled={!shown && !layout.list.available}
      onPress={() => layout.requestSidebar(!shown)}
    />
  );
}

type BandLeadingReads = PartReads<
  'list',
  'bandLeading' | 'list' | 'requestSidebar'
>;

const sidebarControl = ({
  scaffold,
  layout,
}: BandLeadingReads): ReactElement | null =>
  scaffold.list ? <SidebarBandToggle layout={layout} /> : null;

function BandLeading(parts: BandLeadingReads): ReactElement {
  const { width, inset } = parts.layout.bandLeading;
  const style = { width, paddingLeft: inset };

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
  return (
    <FixedSizeChrome>
      <View
        testID="window-band"
        className="absolute inset-x-0 top-0 z-50 flex-row items-center web:[app-region:drag]"
        style={{ top: parts.layout.safeTop, height: parts.layout.panesTop }}
      >
        <BandLeading {...parts} />
        <BandTitle {...parts} />
        <BandTrailing {...parts} />
      </View>
    </FixedSizeChrome>
  );
}
