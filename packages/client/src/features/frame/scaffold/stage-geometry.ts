import type { PaneSpan } from '../utils/pane-shift';
import type { ScaffoldGeometryInput } from './scaffold-geometry';

function stageWidth(input: ScaffoldGeometryInput): number {
  return Math.max(input.measures.inspectorWidth, input.preferredInspectorWidth);
}

export function stageRegion(input: ScaffoldGeometryInput): number {
  return input.inspectorState === 'closed'
    ? 0
    : stageWidth(input) + input.measures.paneGap;
}

function stageTarget(input: ScaffoldGeometryInput): number {
  return input.inspectorState === 'expanded' ? input.width : stageWidth(input);
}

export function frameStage(
  input: ScaffoldGeometryInput,
  contentStart: number,
): PaneSpan {
  const available = Math.max(
    0,
    input.width - contentStart - input.measures.inset,
  );

  const width = resolvedWidth(input, contentStart, available);

  return { offset: input.width - input.measures.inset - width, width };
}

function resolvedWidth(
  input: ScaffoldGeometryInput,
  contentStart: number,
  available: number,
): number {
  return input.inspectorState === 'closed'
    ? 0
    : Math.min(
        available,
        stageTarget(input),
        stageLimit(input, contentStart, available),
      );
}

function stageLimit(
  input: ScaffoldGeometryInput,
  contentStart: number,
  available: number,
): number {
  if (input.inspectorState === 'expanded') return available;

  const { measures } = input;
  const floor = measures.composerWidth + measures.contentGutter * 2;

  return Math.max(
    measures.inspectorWidth,
    input.width - contentStart - measures.paneGap - floor,
  );
}
