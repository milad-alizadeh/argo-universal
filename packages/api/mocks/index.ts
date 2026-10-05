import type { Services } from '../src/services';

type ServiceOverrides = { [Name in keyof Services]?: Partial<Services[Name]> };

const unreachable = (procedure: string) => () => {
  throw new Error(`Unexpected call to ${procedure}`);
};

// Services whose every method throws, except the ones a test gives.
export function unreachableServices(
  overrides: ServiceOverrides = {},
): Services {
  return {
    system: {
      info: unreachable('system.info'),
      clock: unreachable('system.clock'),
      ...overrides.system,
    },
    feed: {
      page: unreachable('feed.page'),
      row: unreachable('feed.row'),
      subscribe: unreachable('feed.subscribe'),
      ...overrides.feed,
    },
  };
}
