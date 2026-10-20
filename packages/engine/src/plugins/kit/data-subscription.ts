import type {
  PluginDataRequest,
  PluginDataState,
} from '@repo/contracts/plugins/argo-calls';
import type { PluginViewId } from '@repo/contracts/plugins/wire';

export type DataCall = (request: PluginDataRequest) => Promise<PluginDataState>;

export type DataSnapshot = { state: PluginDataState; version: number };

export const emptyData: DataSnapshot = {
  state: { stale: false, revision: 0 },
  version: 0,
};

export type DataTarget = {
  viewId: PluginViewId | null;
  watchId: string;
  identity: string | null;
  every?: number;
};

type SubscribedTarget = DataTarget & { viewId: PluginViewId; identity: string };

export class DataSubscription {
  private active = true;
  private pending = true;
  private latest = 0;
  private revision = -1;
  private answer: PluginDataState['data'];
  seen = 0;

  constructor(
    private readonly call: DataCall,
    readonly target: SubscribedTarget,
    private readonly changed: (snapshot: DataSnapshot) => void,
  ) {}

  get ready(): boolean {
    return !this.pending && this.seen >= this.latest;
  }

  start(): void {
    const { viewId, watchId, every, identity } = this.target;

    void this.call({
      api: 'data',
      action: 'watch',
      viewId,
      watchId,
      every,
      query: JSON.parse(identity),
    }).then(
      (state) => this.accept(state),
      (error: Error) => this.failed(error),
    );
  }

  accept(state: PluginDataState): void {
    if (!this.active) return;
    this.pending = false;

    if (state.revision <= this.revision) return;
    const published = withStableAnswer(state, this.answer);
    this.answer = published.data;
    this.revision = state.revision;
    this.latest += 1;
    this.changed({ state: published, version: this.latest });
  }

  private failed(error: Error): void {
    this.accept({ ...emptyData.state, error: error.message });
  }

  close(): void {
    this.active = false;
    const { viewId, watchId } = this.target;

    void this.call({ api: 'data', action: 'release', viewId, watchId }).catch(
      () => {},
    );
  }
}

function withStableAnswer(
  state: PluginDataState,
  answer: PluginDataState['data'],
): PluginDataState {
  if (answer === undefined) return state;

  return metadataUpdate(state) ? { ...state, data: answer } : state;
}

function metadataUpdate(state: PluginDataState): boolean {
  return state.stale || state.error !== undefined;
}
