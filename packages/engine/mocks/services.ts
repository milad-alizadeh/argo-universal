import type { Services } from '../src/services/services';
export { startRouterTestHost } from './router';

type ServiceOverrides = { [Name in keyof Services]?: Partial<Services[Name]> };

const createUnexpectedCallRejection =
  (procedure: string): (() => never) =>
  (): never => {
    throw new Error(`Unexpected call to ${procedure}`);
  };

// Services whose every method throws, except the ones a test gives.
export function createRejectingServices(
  overrides: ServiceOverrides = {},
): Services {
  return {
    projects: {
      list: createUnexpectedCallRejection('projects.list'),
      branches: createUnexpectedCallRejection('projects.branches'),
      ...overrides.projects,
    },
    system: {
      info: createUnexpectedCallRejection('system.info'),
      clock: createUnexpectedCallRejection('system.clock'),
      ...overrides.system,
    },
    feed: {
      page: createUnexpectedCallRejection('feed.page'),
      row: createUnexpectedCallRejection('feed.row'),
      subscribe: createUnexpectedCallRejection('feed.subscribe'),
      ...overrides.feed,
    },
  };
}
