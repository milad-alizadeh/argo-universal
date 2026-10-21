import { longWrittenPlan } from '../../../../../mocks/feed-paper';
import { recordedAcpContent } from '../../../../lib/product/acp-feed-content.mocks';
import type { WrittenPlanValue } from './written-plan';

// A written Plan long enough to scroll inside the tray and the sheet.
export const markdownWrittenPlan: WrittenPlanValue = longWrittenPlan;

const fileRow = recordedAcpContent('agent-1').rows.find(
  (row) => row.sessionUpdate === 'plan_update' && row.plan.type === 'file',
);

if (fileRow?.sessionUpdate !== 'plan_update' || fileRow.plan.type !== 'file')
  throw new Error('Recorded ACP content needs a file Plan');

// The Agent wrote the Plan to a file: the trigger names the file and the card is as tall as itself.
export const planFileWrittenPlan: WrittenPlanValue = fileRow.plan;
