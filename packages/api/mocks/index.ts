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
    blob: { upload: unreachable('blob.upload'), ...overrides.blob },
    agents: { list: unreachable('agents.list'), ...overrides.agents },
    projects: {
      list: unreachable('projects.list'),
      branches: unreachable('projects.branches'),
      ...overrides.projects,
    },
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
    session: {
      list: unreachable('session.list'),
      listUpdates: unreachable('session.listUpdates'),
      counts: unreachable('session.counts'),
      new: unreachable('session.new'),
      prompt: unreachable('session.prompt'),
      cancel: unreachable('session.cancel'),
      answerPermission: unreachable('session.answerPermission'),
      answerElicitation: unreachable('session.answerElicitation'),
      answerPlanProposal: unreachable('session.answerPlanProposal'),

      setConfigOption: unreachable('session.setConfigOption'),
      ...overrides.session,
    },
  };
}

export * from './feed';
export * from './new-session';
export * from './requests';
export * from './session-list';
