import {
  FixedSizeChrome,
  IconButton,
} from '@repo/kit/primitives/actions/icon-button';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  bandControlAppearance,
  bandToggleAppearance,
} from './band-control-appearance';
import { BandTrailing } from './scaffold-band-controls';
import { BandTitle } from './scaffold-band-title';
import type {
  PartReads,
  ScaffoldLayout,
  ScaffoldPartProps,
} from './use-scaffold-layout';
import { useWindowHistory, type WindowHistory } from './window-history';

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

// Each step's glyph, label, and the history it reads and moves.
const historySteps = {
  back: { icon: 'chevron-left', label: 'Back' },
  forward: { icon: 'chevron-right', label: 'Forward' },
} as const;

type HistoryStep = keyof typeof historySteps;

const stepEnabled = (history: WindowHistory, step: HistoryStep): boolean =>
  step === 'back' ? history.canGoBack : history.canGoForward;

function HistoryButton(props: {
  history: WindowHistory;
  step: HistoryStep;
}): ReactElement {
  const { icon, label } = historySteps[props.step];

  return (
    <IconButton
      {...bandControlAppearance}
      icon={icon}
      accessibilityLabel={label}
      disabled={!stepEnabled(props.history, props.step)}
      onPress={props.history[props.step]}
    />
  );
}

// Back and Forward step through the window's history, as a browser's own buttons do.
function BandHistory(): ReactElement | null {
  const history = useWindowHistory();

  if (!history) return null;

  return (
    <>
      <HistoryButton history={history} step="back" />
      <HistoryButton history={history} step="forward" />
    </>
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
      <BandHistory />
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
