import type { LoaderPageCall } from '@repo/contracts/plugins/page-address';
import type { LiveAnswer } from '@repo/contracts/plugins/page-live';
import type { WireJson } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';
import type { Caller, KindCalls } from '../runtime/worker-calls';
import { checkedPage } from './checked-tree';
import type { Answered, DrawAt, Outcome } from './draw-calls';
import { LatestFrames, liveAnswers } from './live-frames';
import { forApp } from './wire-minimum';

// Where a live draw's worker sends each tree its Loader yields.
type FrameListener = (root: WireJson) => void;

type FrameCall = Extract<LoaderPageCall, { action: 'frame' }>;

// One live subscription: the Plugin, the address drawn, the hash of the tree the App keeps, and how long it lasts.
export type LiveFollow = {
  pluginId: string;
  address: DrawAt;
  known: string | undefined;
  signal: AbortSignal;
};

type LiveDrawsDeps = {
  calls: KindCalls<DrawAt, Answered, Outcome>;
  clock: PluginClock;
  log: (line: string) => void;
};

/*
 * Live pages' draws (ADR-0050): each subscription is one live draw on the running generation with no
 * deadline, its trees coalesced to one a frame, checked as every tree is and sent as keyed patches after the
 * first; an App below the wire minimum is sent "Update Argo" instead (ADR-0034). It ends when the Loader
 * does, its generation ends, or the signal aborts, which stops the Loader.
 */
export class LiveDraws {
  private readonly frames = new WeakMap<DrawAt, FrameListener>();

  public constructor(private readonly deps: LiveDrawsDeps) {}

  public follow(follow: LiveFollow): AsyncGenerator<LiveAnswer> {
    const { pluginId, address, known, signal } = follow;
    const request: DrawAt = { ...address, live: true };
    const { calls, log } = this.deps;
    const at = { pluginId, path: address.path, log };
    const gated = { pluginId, at: address, log };

    return liveAnswers({
      frames: this.framesFor(pluginId, request),
      known,
      signal,
      check: (root) => forApp(gated, checkedPage(at, { root, pages: 0 })),
      stop: () => calls.tell(request, (id) => ({ type: 'stop', id })),
    });
  }

  // A frame counts only from the generation its live draw still waits on.
  public framed(caller: Caller, { id, root }: FrameCall): void {
    const request = this.deps.calls.request(caller, id);

    if (request) this.frames.get(request)?.(root);
  }

  private framesFor(pluginId: string, request: DrawAt): LatestFrames {
    const frames = new LatestFrames(this.deps.clock);

    this.frames.set(request, (root) => frames.push(root));
    void this.deps.calls.call(pluginId, request, null).then((outcome) => {
      this.frames.delete(request);
      frames.end(outcome);
    });

    return frames;
  }
}
