import { drawsPluginWire } from '@repo/contracts/plugins/kit';
import { updateRequiredNode } from '@repo/contracts/plugins/prepare-tree';
import { productName } from '@repo/contracts/product-identity';
import { belowWireMinimum, logOnce } from '../runtime/render-fallback';
import type { DrawAt } from './draw-calls';
import type { Drawn } from './plugin-draws';

type Gated = { pluginId: string; at: DrawAt; log: (line: string) => void };

// Whether the App that asked draws today's Plugin trees (ADR-0034).
export const drawsForApp = ({ surface }: DrawAt): boolean =>
  drawsPluginWire(surface);

/*
 * An App below the wire minimum sees "Update Argo" in place of a drawn page, logged once per Plugin and path
 * (ADR-0034); a failed draw still says why. Any other App sees the tree as drawn.
 */
export function forApp({ pluginId, at, log }: Gated, drawn: Drawn): Drawn {
  if (!drawn.ok || drawsForApp(at)) return drawn;

  logOnce(
    log,
    [pluginId, 'update-argo', at.path],
    `Plugin ${pluginId}: Update ${productName} ${at.path}: ${belowWireMinimum}`,
  );

  return { ...drawn, root: updateRequiredNode(drawn.root.key) };
}
