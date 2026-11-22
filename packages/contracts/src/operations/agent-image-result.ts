import type { Json } from '../plugins/hook-protocol';
import { appOperations } from './app';
import { chartOperations } from './chart';
import type { AgentImageResult } from './image-visibility';

/*
 * The control reply carries JSON without the Operation ID. Match the Chart
 * before the screen image shape, which also recognizes legacy image replies.
 */
export function agentImageResult(result: Json): AgentImageResult | null {
  return (
    chartOperations['chart.preview'].imageVisibility.forAgent(result) ??
    appOperations['app.screenshot'].imageVisibility.forAgent(result)
  );
}
