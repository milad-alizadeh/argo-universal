import type { Argo } from '@argo/plugin-kit';
import { CodeMap } from './code-map';

// The Code Map's own page; the view it opens for names the Project, so each Query runs in that Project's folder.
export const mapPath = '/map';

/*
 * The page is registered and nothing opens it yet. Project details takes items, not a tree (ADR-0046), so the map
 * can only be reached by drilling in, and a Plugin page is routable only under a nav item this Plugin does not
 * declare: where the Code Map lives is the open question in #1445. A row that reported the page unavailable would
 * be worse than no row, so the Plugin contributes none until that is settled.
 */
export function register(api: Argo): void {
  api.pages.register(mapPath, CodeMap);
}
