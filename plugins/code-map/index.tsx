import type { Argo, ProjectDetailsItem } from '@argo/plugin-kit';
import { CodeMap } from './code-map';

// The Code Map's own page; the view it opens for names the Project, so each Query runs in that Project's folder.
export const mapPath = '/map';

// Project details takes items, not a tree, so the map moved to a page the row drills into (ADR-0046).
const mapRow: ProjectDetailsItem = {
  title: 'Code Map',
  action: { path: mapPath },
};

export function register(api: Argo): void {
  api.pages.register(mapPath, CodeMap);

  api.slots.register('argo/project/details/v1', ({ contexts }) =>
    Object.fromEntries(contexts.map(({ projectId }) => [projectId, [mapRow]])),
  );
}
