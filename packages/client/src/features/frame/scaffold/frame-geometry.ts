import type { PaneSpan } from '../utils/pane-shift';
import { frameContent } from './content-geometry';
import type { FrameGeometry } from './frame-geometry-types';
import type { ScaffoldGeometryInput } from './scaffold-geometry';
import { frameStage, stageRegion } from './stage-geometry';
import {
  frameWorkbench,
  workbenchState,
  workbenchRegion,
} from './workbench-geometry';

export interface FrameRegions {
  listFolded: boolean;
  workbenchDocked: boolean;
  list: PaneSpan;
  stage: PaneSpan;
  contentStart: number;
  workbenchRegion: number;
  stageRegion: number;
}

function listWidth(input: ScaffoldGeometryInput): number {
  return Math.max(input.measures.listWidth, input.preferredListWidth);
}

function frameThresholds(
  input: ScaffoldGeometryInput,
): FrameGeometry['thresholds'] {
  const { measures } = input;
  const contentMinimum = measures.composerWidth + measures.contentGutter * 2;
  const foldedWidth = measures.railWidth + measures.inset * 2 + contentMinimum;

  const workbenchUndock =
    foldedWidth + workbenchRegion(input) + stageRegion(input);

  return { listFold: workbenchUndock + listWidth(input), workbenchUndock };
}

function frameList(input: ScaffoldGeometryInput, threshold: number): PaneSpan {
  const folded = !input.sidebarShown || input.width < threshold;

  return {
    offset: input.measures.inset + input.measures.railWidth,
    width: folded ? 0 : listWidth(input),
  };
}

function occupiedWidth(width: number, gap: number): number {
  return width > 0 ? width + gap : 0;
}

function trailingRegions(
  input: ScaffoldGeometryInput,
  stage: PaneSpan,
  threshold: number,
): Pick<FrameRegions, 'workbenchDocked' | 'workbenchRegion' | 'stageRegion'> {
  const docked = workbenchState(input, threshold) === 'docked';

  return {
    workbenchDocked: docked,
    workbenchRegion: occupiedWidth(
      docked ? input.measures.workbenchWidth : 0,
      input.measures.paneGap,
    ),
    stageRegion: occupiedWidth(stage.width, input.measures.paneGap),
  };
}

function frameRegions(
  input: ScaffoldGeometryInput,
  thresholds: FrameGeometry['thresholds'],
): FrameRegions {
  const list = frameList(input, thresholds.listFold);
  const contentStart = list.offset + list.width + input.measures.inset;
  const stage = frameStage(input, contentStart);

  return {
    listFolded: list.width === 0,
    list,
    contentStart,
    stage,
    ...trailingRegions(input, stage, thresholds.workbenchUndock),
  };
}

export function contentAvailable(
  input: ScaffoldGeometryInput,
  regions: FrameRegions,
): number {
  if (input.inspectorState === 'expanded') return 0;

  return Math.max(
    0,
    input.width -
      regions.contentStart -
      regions.workbenchRegion -
      regions.stageRegion,
  );
}

function framePage(
  input: ScaffoldGeometryInput,
  regions: FrameRegions,
): PaneSpan {
  return {
    offset: regions.contentStart,
    width: contentAvailable(input, regions),
  };
}

// Additive geometry; existing panes still consume scaffoldGeometry's legacy outputs.
export function frameGeometry(input: ScaffoldGeometryInput): FrameGeometry {
  const thresholds = frameThresholds(input);
  const regions = frameRegions(input, thresholds);

  return {
    panesTop: input.measures.topBandHeight,
    thresholds,
    listFolded: regions.listFolded,
    workbenchDocked: regions.workbenchDocked,

    rail: { offset: input.measures.inset, width: input.measures.railWidth },
    list: regions.list,
    stage: regions.stage,
    ...contentRegions(input, regions, thresholds.workbenchUndock),
  };
}

function contentRegions(
  input: ScaffoldGeometryInput,
  regions: FrameRegions,
  threshold: number,
): Pick<FrameGeometry, 'workbenchState' | 'page' | 'content' | 'workbench'> {
  const page = framePage(input, regions);
  const state = workbenchState(input, threshold);

  return {
    page,
    workbenchState: state,
    content: frameContent(input, page),
    workbench: frameWorkbench(input, regions.stageRegion, state),
  };
}
