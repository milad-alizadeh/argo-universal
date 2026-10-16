import type { RequestPermissionRequest } from '@agentclientprotocol/sdk';
import type {
  PendingPermission,
  PendingPlanProposal,
  PermissionOption,
} from '@repo/contracts';
import { z } from 'zod';
import {
  type AcpRequestIntake,
  toPendingPermission,
} from './acp-request-intake';

// A Plan proposal held open for the App. ACP has no Plan proposal, so it arrives as a Permission request to leave plan mode carrying the written plan, as Claude's ExitPlanMode sends it (#58); `requestId` is the Plan proposal's `planId`.
export type HeldPlanProposal = {
  requestId: string;
  toolCallId: string;
  content: string;
  // Approve allows once, so the Agent leaves plan mode for its default mode (Spec 0003).
  approve: PermissionOption;
  // Keep planning rejects once; ACP carries no feedback, so it follows as a prompt.
  keepPlanning: PermissionOption;
};

type ToolCall = RequestPermissionRequest['toolCall'];

const RawPlan = z.object({ plan: z.string() });

const rawPlan = ({ rawInput }: ToolCall): string | undefined =>
  RawPlan.safeParse(rawInput).data?.plan;

const displayedPlan = ({ content }: ToolCall): string =>
  (content ?? [])
    .flatMap((item) =>
      item.type === 'content' && item.content.type === 'text'
        ? [item.content.text]
        : [],
    )
    .join('\n\n');

const optionOfKind = (
  options: RequestPermissionRequest['options'],
  kind: 'allow_once' | 'reject_once',
): PermissionOption | undefined => {
  const option = options.find((candidate) => candidate.kind === kind);

  return option && { optionId: option.optionId, name: option.name, kind };
};

// Only a switch out of plan mode carries a plan; Claude puts it in `rawInput`, other Agents may only display it.
const planOf = (toolCall: ToolCall): string =>
  toolCall.kind === 'switch_mode'
    ? (rawPlan(toolCall) ?? displayedPlan(toolCall)).trim()
    : '';

const choicesOf = (
  options: RequestPermissionRequest['options'],
): Pick<HeldPlanProposal, 'approve' | 'keepPlanning'> | undefined => {
  const approve = optionOfKind(options, 'allow_once');
  const keepPlanning = optionOfKind(options, 'reject_once');

  return approve && keepPlanning && { approve, keepPlanning };
};

// The Plan proposal a Permission request makes, or null when it is an ordinary Permission request.
export const toHeldPlanProposal = (
  requestId: string,
  { toolCall, options }: RequestPermissionRequest,
): HeldPlanProposal | null => {
  const content = planOf(toolCall);
  const choices = choicesOf(options);

  return content && choices
    ? { requestId, toolCallId: toolCall.toolCallId, content, ...choices }
    : null;
};

export const toPendingPlanProposal = (
  proposal: HeldPlanProposal | null,
): PendingPlanProposal | null =>
  proposal && { planId: proposal.requestId, content: proposal.content };

// A Permission request, presented as a Plan proposal when it carries one.
export const toPermissionIntake = (
  requestId: string,
  params: RequestPermissionRequest,
): AcpRequestIntake<PendingPermission | HeldPlanProposal> => {
  const plan = toHeldPlanProposal(requestId, params);

  return plan
    ? { type: 'presented', request: plan }
    : toPendingPermission(requestId, params);
};
