import type { Services } from '../src/services/services';
export { createRouterHost } from './router';

export const mockUpload: Services['blob']['upload'] = async (file) => ({
  blobId: await file.text(),
  mime: file.type || 'application/octet-stream',
  bytes: file.size,
});

type ServiceOverrides = { [Name in keyof Services]?: Partial<Services[Name]> };

const unreachable =
  (procedure: string): (() => never) =>
  (): never => {
    throw new Error(`Unexpected call to ${procedure}`);
  };

// Services whose every method throws, except the ones a test gives.
export function unreachableServices(
  overrides: ServiceOverrides = {},
): Services {
  return {
    blob: { upload: unreachable('blob.upload'), ...overrides.blob },
    agents: { list: unreachable('agents.list'), ...overrides.agents },
    projects: {
      list: unreachable('projects.list'),
      branches: unreachable('projects.branches'),
      ...overrides.projects,
    },
    feed: {
      page: unreachable('feed.page'),
      row: unreachable('feed.row'),
      subscribe: unreachable('feed.subscribe'),
      ...overrides.feed,
    },
  };
}
