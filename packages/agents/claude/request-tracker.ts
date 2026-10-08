import type { PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import type { VendorSessionListener } from '../src/agent-adapter';
import type { VendorMessage, SDKControlRequest } from './messages';
export const cancelledRequestReason = 'Request cancelled';
type Request = {
  resolve: (answer: PermissionResult) => void;
  message: SDKControlRequest;
};
class RequestTracker {
  private pending = new Map<string, Request>();
  private questions: string[] = [];
  private listener: VendorSessionListener<VendorMessage>;
  public constructor(listener: VendorSessionListener<VendorMessage>) {
    this.listener = listener;
  }
  public add(message: SDKControlRequest, resolve: Request['resolve']): void {
    if (message.request.subtype !== 'can_use_tool') return;
    const id = message.request.tool_use_id;
    this.pending.set(id, { resolve, message });
    if (this.enqueueQuestion(message.request)) this.listener.message(message);
  }
  private enqueueQuestion(
    request: Extract<SDKControlRequest['request'], { subtype: 'can_use_tool' }>,
  ): boolean {
    if (request.tool_name !== 'AskUserQuestion') return true;
    this.questions.push(request.tool_use_id);
    return this.questions.length === 1;
  }
  public head():
    | { toolUseId: string; input: Record<string, unknown> }
    | undefined {
    const id = this.questions[0];
    if (!id) return undefined;
    return this.question(id);
  }
  private question(
    id: string,
  ): { toolUseId: string; input: Record<string, unknown> } | undefined {
    const pending = this.pending.get(id);
    if (!pending) return undefined;
    const request = pending.message.request;
    return request.subtype === 'can_use_tool'
      ? { toolUseId: id, input: request.input }
      : undefined;
  }
  public remove(id: string, advance = true): Request | undefined {
    const request = this.pending.get(id);
    this.pending.delete(id);
    const index = this.questions.indexOf(id);
    if (index >= 0) this.questions.splice(index, 1);
    this.advance(advance, index);
    return request;
  }
  private advance(advance: boolean, index: number): void {
    if (advance && index === 0) this.announceHead();
  }
  private announceHead(): void {
    const id = this.questions[0];
    const next = id ? this.pending.get(id) : undefined;
    if (next) this.listener.message(next.message);
  }
  public cancel(): number {
    const cancelled = [...this.pending.values()];
    this.pending.clear();
    this.questions.length = 0;
    for (const request of cancelled)
      request.resolve({ behavior: 'deny', message: cancelledRequestReason });
    return cancelled.length;
  }
}
export const createRequestTracker = (
  listener: VendorSessionListener<VendorMessage>,
): RequestTracker => new RequestTracker(listener);
export type Requests = ReturnType<typeof createRequestTracker>;
