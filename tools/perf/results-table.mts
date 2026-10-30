import type { Result } from './results.mts';
import type { Sample } from './sample.mts';

const fixed = (value: number, digits: number): string => value.toFixed(digits);

type FrameColumns = {
  fps: string;
  p95: string;
  max: string;
  dropped: number;
  ccDropped: number;
};

type CostColumns = { layoutMs: string; styleMs: string; scriptMs: string };

// One printed line of the medians table.
type Row = { interaction: string; cpu: string } & FrameColumns & CostColumns;

const frameColumns = (value: Sample): FrameColumns => ({
  fps: fixed(value.fps, 1),
  p95: fixed(value.p95Ms, 1),
  max: fixed(value.maxMs, 1),
  dropped: value.droppedFrames,
  ccDropped: value.compositorDropped,
});

const costColumns = (value: Sample): CostColumns => ({
  layoutMs: fixed(value.layoutMs, 0),
  styleMs: fixed(value.styleMs, 0),
  scriptMs: fixed(value.scriptMs, 0),
});

export const medianRow = ({ interaction, cpu, median }: Result): Row => ({
  interaction,
  cpu: `${cpu}x`,
  ...frameColumns(median),
  ...costColumns(median),
});
