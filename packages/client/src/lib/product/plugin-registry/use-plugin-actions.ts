import type { Action, OverlayAction } from '@repo/contracts/plugins/wire';
import { useReducer, useState } from 'react';
import { runAction } from '../plugin-dispatcher';
import type { PluginOnEvent } from './plugin-rendering';

export function usePluginActions(inherited?: PluginActions): PluginActions {
  const [, update] = useReducer((revision: number) => revision + 1, 0);
  const [state] = useState(() => new Overlays(update));

  return (
    inherited ?? {
      overlay: state.overlay,
      pending: state.pending,
      registerFlush: state.registerFlush,
      run: state.run,
      finish: state.finish,
    }
  );
}

class Overlays {
  public overlay: OpenOverlay | null = null;
  public pending: Answer | null = null;
  private generation = 0;
  private readonly flushers = new Set<Flush>();
  constructor(private readonly update: () => void) {}

  public registerFlush = (flush: Flush): (() => void) => {
    this.flushers.add(flush);

    return () => {
      this.flushers.delete(flush);
    };
  };

  public run = async (action: Action, target: ActionTarget): Promise<void> => {
    if ('content' in action) return this.open(action, target);

    if (action.action === 'dismiss') return this.finish(false);
    await runAction(action);
  };

  private async open(
    action: OverlayAction,
    target: ActionTarget,
  ): Promise<void> {
    if (this.pending)
      throw new Error('The open overlay is waiting for its handler');
    await this.finish(false);
    this.generation += 1;
    this.overlay = { id: this.generation, action, target };
    this.update();
  }

  public finish = async (confirmed: boolean, id?: number): Promise<void> => {
    const overlay = this.available(id);

    if (!overlay) return;
    this.pending = confirmed ? 'onConfirm' : 'onDismiss';
    this.update();

    try {
      await this.answer(overlay, this.pending);
      this.overlay = null;
    } finally {
      this.closeDismissed(confirmed);
      this.pending = null;
      this.update();
    }
  };

  private closeDismissed(confirmed: boolean): void {
    if (!confirmed) this.overlay = null;
  }

  private available(id?: number): OpenOverlay | null {
    if (this.pending) return null;

    if (id === undefined) return this.overlay;

    return matching(this.overlay, id);
  }

  private async answer(overlay: OpenOverlay, event: Answer): Promise<void> {
    if (event === 'onConfirm')
      await Promise.all([...this.flushers].map((flush) => flush()));
    const handler = overlay.action[event];

    if (!handler) return;
    const { target } = overlay;
    const path = answerPath(handler, target, event);
    await target.send(target.key, { event: 'onAction', payload: { path } });
  }
}

function matching(overlay: OpenOverlay | null, id: number): OpenOverlay | null {
  return overlay?.id === id ? overlay : null;
}

export interface ActionTarget {
  key: string;
  path: string[];
  send: PluginOnEvent;
}

export interface OpenOverlay {
  id: number;
  action: OverlayAction;
  target: ActionTarget;
}

export type Answer = 'onConfirm' | 'onDismiss';

export type Flush = () => Promise<void>;

export type PluginActions = Pick<Overlays, keyof Overlays>;

function answerPath(
  handler: { $path?: string[] },
  target: ActionTarget,
  event: Answer,
): string[] {
  return handler.$path ?? [...target.path, event];
}
