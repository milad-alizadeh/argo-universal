import type { PageAddress } from '@repo/contracts/plugins/page-address';
import { oneLine } from '../runtime/render-fallback';
import { addressOf, failed, type DrawAt } from './draw-calls';
import type { Drawn } from './plugin-draws';

/*
 * Where a page's drawing failures go: the failures the App shows, one toast per Plugin (ADR-0037). `failed`
 * answers whether the failure is news, so a page failing the same way again is logged once.
 */
export type Drawings = {
  failed: (address: PageAddress, message: string) => boolean;
  clearDrawing: (address: PageAddress) => void;
};

// A Loader or Render that threw, ran out of time or stopped; or a tree the Server refused to send.
type FailureKind = 'threw' | 'refused';

const verbs: Record<FailureKind, string> = {
  threw: 'could not draw',
  refused: 'refused',
};

// The page a draw is for: its Plugin and its address.
export type DrawnFor = { pluginId: string; at: DrawAt };

type Failing = DrawnFor & { kind: FailureKind };

/*
 * A page's draws as the Server reports them: a failure is logged once and shown to the App, and the next
 * tree the address draws clears it (ADR-0037, ADR-0031).
 */
export class DrawingFailures {
  public constructor(
    private readonly drawings: Drawings,
    private readonly log: (line: string) => void,
  ) {}

  public failed({ pluginId, at, kind }: Failing, error: string): void {
    if (!this.drawings.failed(addressOf(pluginId, at), error)) return;

    this.log(
      `Plugin ${pluginId}: ${verbs[kind]} ${oneLine(at.path)}: ${oneLine(error)}`,
    );
  }

  public drew({ pluginId, at }: DrawnFor): void {
    this.drawings.clearDrawing(addressOf(pluginId, at));
  }

  // A Loader or Render that threw or ran out of time: the page's drawing failure, answered as a failed draw.
  public threw(page: DrawnFor, error: string): Drawn {
    this.failed({ ...page, kind: 'threw' }, error);

    return failed(error);
  }

  // A tree the Server checked: a refused one is the page's drawing failure, and a sent one clears it.
  public checked(page: DrawnFor, drawn: Drawn): Drawn {
    if (drawn.ok) this.drew(page);
    else this.failed({ ...page, kind: 'refused' }, drawn.error);

    return drawn;
  }
}
