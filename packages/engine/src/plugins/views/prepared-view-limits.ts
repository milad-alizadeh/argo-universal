import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import {
  pluginMessageBytes,
  pluginPageBytes,
} from '@repo/contracts/plugins/wire-limits';
import { wireSizeReason } from './wire-size';

// Preparation may grow an otherwise admissible page; each App keeps its own refusal state.
export class PreparedViewLimits {
  private refused = false;

  constructor(
    private readonly log: (reason: string) => void,
    private readonly fallback: WireNode,
  ) {}

  accept(root: WireNode, message: ViewMessage): ViewMessage | null {
    const reason =
      wireSizeReason(root, pluginPageBytes, 'prepared page') ??
      wireSizeReason(message, pluginMessageBytes, 'prepared message');

    if (reason) return this.refuse(reason, message);
    this.refused = false;

    return message;
  }

  private refuse(reason: string, message: ViewMessage): ViewMessage | null {
    if (this.refused) return null;
    this.refused = true;
    this.log(reason);

    return {
      type: 'snapshot',
      revision: message.revision,
      viewId: message.viewId,
      root: this.fallback,
    };
  }
}
