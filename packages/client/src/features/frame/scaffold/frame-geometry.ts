import type { PaneSpan } from '../utils/pane-shift';
import type { FrameGeometry } from './frame-geometry-types';
import type { ScaffoldGeometryInput } from './scaffold-geometry';

interface FrameRegions {
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

function stageWidth(input: ScaffoldGeometryInput): number {
  return Math.max(input.measures.inspectorWidth, input.preferredInspectorWidth);
}

function stageRegion(input: ScaffoldGeometryInput): number {
  return input.inspectorState === 'closed'
    ? 0
    : stageWidth(input) + input.measures.paneGap;
}

function frameThresholds(
  input: ScaffoldGeometryInput,
): FrameGeometry['thresholds'] {
  const { measures } = input;
  const contentMinimum = measures.composerWidth + measures.contentGutter * 2;
  const foldedWidth = measures.railWidth + measures.inset * 2 + contentMinimum;

  const workbenchUndock =
    foldedWidth +
    measures.workbenchWidth +
    measures.paneGap +
    stageRegion(input);

  return { listFold: workbenchUndock + listWidth(input), workbenchUndock };
}

function frameList(input: ScaffoldGeometryInput, threshold: number): PaneSpan {
  const folded = !input.sidebarShown || input.width < threshold;

  return {
    offset: input.measures.inset + input.measures.railWidth,
    width: folded ? 0 : listWidth(input),
  };
}

function stageTarget(input: ScaffoldGeometryInput): number {
  return input.inspectorState === 'expanded' ? input.width : stageWidth(input);
}

function frameStage(
  input: ScaffoldGeometryInput,
  contentStart: number,
): PaneSpan {
  const available = Math.max(
    0,
    input.width - contentStart - input.measures.inset,
  );

  const width =
    input.inspectorState === 'closed'
      ? 0
      : Math.min(available, stageTarget(input));

  return { offset: input.width - input.measures.inset - width, width };
}

function workbenchDocked(
  input: ScaffoldGeometryInput,
  threshold: number,
): boolean {
  return input.inspectorState !== 'expanded' && input.width >= threshold;
}

function occupiedWidth(width: number, gap: number): number {
  return width > 0 ? width + gap : 0;
}

function trailingRegions(
  input: ScaffoldGeometryInput,
  stage: PaneSpan,
  threshold: number,
): Pick<FrameRegions, 'workbenchDocked' | 'workbenchRegion' | 'stageRegion'> {
  const docked = workbenchDocked(input, threshold);

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

function contentAvailable(
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

function frameContent(
  input: ScaffoldGeometryInput,
  regions: FrameRegions,
): PaneSpan {
  const available = contentAvailable(input, regions);

  const width = Math.min(
    available,
    input.measures.contentMaximum + input.measures.contentGutter * 2,
  );

  return { offset: regions.contentStart + (available - width) / 2, width };
}

function frameWorkbench(
  input: ScaffoldGeometryInput,
  regions: FrameRegions,
): PaneSpan {
  const width = regions.workbenchDocked ? input.measures.workbenchWidth : 0;

  return { offset: input.width - regions.stageRegion - width, width };
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
    content: frameContent(input, regions),
    workbench: frameWorkbench(input, regions),
  };
}
