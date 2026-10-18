import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import {
  pluginMessageBytes,
  pluginPageBytes,
  pluginPageFallback,
} from '@repo/contracts/plugins/wire-limits';
import { wireSizeReason } from './wire-size';

// Adaptation may grow an otherwise admissible page; each App keeps its own refusal state.
export class AdaptedViewLimits {
  private refused = false;

  constructor(private readonly log: (reason: string) => void) {}

  accept(root: WireNode, message: ViewMessage): ViewMessage | null {
    const reason =
      wireSizeReason(root, pluginPageBytes, 'adapted page') ??
      wireSizeReason(message, pluginMessageBytes, 'adapted message');

    if (reason) return this.refuse(reason, message.revision);
    this.refused = false;

    return message;
  }

  private refuse(reason: string, revision: number): ViewMessage | null {
    if (this.refused) return null;
    this.refused = true;
    this.log(reason);

    return { type: 'snapshot', revision, root: pluginPageFallback };
  }
}
