import {
  FixedSizeChrome,
  IconButton,
} from '@repo/kit/primitives/actions/icon-button';
import type { ReactElement, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { BandRef } from '../hooks/band-motion-types';
import { useBandMotion } from '../hooks/use-band-motion';
import { BandCapsule } from './band-capsule';
import {
  bandControlAppearance,
  bandToggleAppearance,
} from './band-control-appearance';
import { historyLeft, leadingPill, titleSpan } from './band-geometry';
import { bandGeometryInput, inBand } from './band-input';
import { BandTrailing } from './scaffold-band-controls';
import type { ScaffoldLayout, ScaffoldPartProps } from './use-scaffold-layout';
import { type HistoryStep, useWindowHistory } from './window-history';

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
      onPress={() => layout.requestSidebar(!shown)}
    />
  );
}

// Each step's glyph and label.
const historySteps = {
  back: { icon: 'chevron-left', label: 'Back' },
  forward: { icon: 'chevron-right', label: 'Forward' },
} as const;

function HistoryButton(props: {
  step: HistoryStep;
  kind: keyof typeof historySteps;
}): ReactElement {
  const { icon, label } = historySteps[props.kind];

  return (
    <IconButton
      {...bandControlAppearance}
      icon={icon}
      accessibilityLabel={label}
      disabled={!props.step.enabled}
      onPress={props.step.go}
    />
  );
}

// Back and Forward step through the window's history, as a browser's own buttons do, tight after the sidebar toggle as macOS's own are.
function BandHistory({ left }: { left: number }): ReactElement | null {
  const history = useWindowHistory();

  if (!history) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 top-0 flex-row items-center gap-1"
      style={{ left }}
    >
      <HistoryButton step={history.back} kind="back" />
      <HistoryButton step={history.forward} kind="forward" />
    </View>
  );
}

/*
 * The sidebar toggle stays beside the window buttons. Back and Forward jump between the sidebar's trailing edge
 * and the leading capsule without joining the panel animation.
 */
function BandLeading(parts: ScaffoldPartProps): ReactElement {
  const { layout } = parts;
  const geometry = bandGeometryInput(parts);
  const folded = geometry.listed && layout.list.folded;

  return (
    <>
      {folded ? (
        <BandCapsule
          side="leading"
          box={inBand(leadingPill(geometry), layout.safeTop)}
        />
      ) : null}
      <View
        testID="window-band-leading"
        pointerEvents="box-none"
        className="absolute inset-x-0 bottom-0 top-0 flex-row items-center"
        style={{ paddingLeft: layout.bandLeading.toggle }}
      >
        {geometry.listed ? <SidebarBandToggle layout={layout} /> : null}
        <BandHistory left={historyLeft(geometry)} />
      </View>
    </>
  );
}

// The heading runs from the page's edge, or the closed sidebar's capsule, to the Inspector or its capsule.
const titleStyle = (parts: ScaffoldPartProps): ViewStyle => {
  const span = titleSpan(bandGeometryInput(parts));

  return { left: span.left, right: span.right };
};

// The shown page's heading, as Claude's and Codex's windows title theirs: gone while an expanded Inspector covers the page.
function BandTitle({
  motionRef,
  ...parts
}: ScaffoldPartProps & { motionRef: BandRef }): ReactElement {
  const title = parts.layout.page.hidden ? null : parts.scaffold.band?.title;

  return (
    <View
      ref={motionRef}
      testID="window-band-title"
      pointerEvents="box-none"
      className="absolute bottom-0 top-0 flex-row items-center"
      style={titleStyle(parts)}
    >
      {title ? <View className="min-w-0 flex-1">{title}</View> : null}
    </View>
  );
}

// The title bar's row over the panes' top, centred where macOS centres the window buttons, as on a window without floating panels.
const bandStyle = ({ layout }: ScaffoldPartProps): ViewStyle => ({
  top: layout.safeTop,
  height: layout.panesTop,
});

function BandRow({ children }: { children: ReactNode }): ReactElement {
  return (
    <View pointerEvents="box-none" className="flex-1">
      {children}
    </View>
  );
}

// Touches between the controls reach the panes under the title bar, such as the Inspector's own top row.
export function ScaffoldBand(parts: ScaffoldPartProps): ReactElement {
  const refs = useBandMotion(parts.layout.motion);

  return (
    <FixedSizeChrome>
      <View
        testID="window-band"
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 z-50 web:[app-region:drag]"
        style={bandStyle(parts)}
      >
        <BandRow>
          <BandLeading {...parts} />
          <BandTitle {...parts} motionRef={refs.title} />
          <BandTrailing {...parts} movingRef={refs.moving} />
        </BandRow>
      </View>
    </FixedSizeChrome>
  );
}
