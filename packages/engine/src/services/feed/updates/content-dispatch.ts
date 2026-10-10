import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { ContentAssemblyInput, ContentAssemblyResult } from './assembly';
import { applyCompactionUpdate } from './compaction';
import { appendCompactionSummary } from './compaction-summary';
import { assembleAcpMessage } from './messages';
import { createNoticeChange } from './notices';
import { assemblePlanUpdate } from './plans';
import { assembleToolCall } from './tools';
import { assembleUnaddressedPlan } from './unaddressed-plan';

type AcpUpdate = SessionNotification['update'];
type AddressedPlanUpdate = Extract<
  AcpUpdate,
  { sessionUpdate: 'plan_update' | 'plan_removed' }
>;
const isAddressedPlanUpdate = (
  update: AcpUpdate,
): update is AddressedPlanUpdate =>
  update.sessionUpdate === 'plan_update' ||
  update.sessionUpdate === 'plan_removed';
const assemblePlanContent = (
  input: ContentAssemblyInput,
): ContentAssemblyResult => {
  if (input.update.sessionUpdate === 'plan')
    return assembleUnaddressedPlan({ ...input, update: input.update });
  if (!isAddressedPlanUpdate(input.update)) return undefined;
  return assembleAddressedPlanContent({ ...input, update: input.update });
};
const assembleAddressedPlanContent = (
  input: ContentAssemblyInput & { update: AddressedPlanUpdate },
): ContentAssemblyResult => {
  const result = assemblePlanUpdate(input);
  return 'rejection' in result ? result : { change: result };
};
const assembleConversationContent = (
  input: ContentAssemblyInput,
): ContentAssemblyResult => {
  if (
    input.update.sessionUpdate === 'tool_call' ||
    input.update.sessionUpdate === 'tool_call_update'
  )
    return assembleToolCall({ ...input, update: input.update });
  return assembleAcpMessage(input);
};
const assembleCompactionContent = (
  input: ContentAssemblyInput,
): ContentAssemblyResult => {
  if (input.update.sessionUpdate === 'compaction_update')
    return applyCompactionUpdate(input, input.update);
  if (input.update.sessionUpdate === 'compaction_summary_chunk')
    return appendCompactionSummary(input, input.update);
  return undefined;
};
const assembleAdvisoryContent = (
  input: ContentAssemblyInput,
): ContentAssemblyResult => {
  if (input.update.sessionUpdate !== 'notice')
    return assembleCompactionContent(input);
  return createNoticeChange(input.update, {
    acpSessionId: input.acpSessionId,
    localPosition: input.feed.nextPosition,
  });
};
export const assembleContentChange = (
  input: ContentAssemblyInput,
): ContentAssemblyResult => {
  const conversation = assembleConversationContent(input);
  if (conversation) return conversation;
  return assemblePlanContent(input) ?? assembleAdvisoryContent(input);
};
