import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import { answer } from './github-fixture-data';

const badGateway = 502;

type Handler = (request: FixtureRequest) => Promise<FixtureAnswer>;

// GitHub's API going down and coming back: while down, every `api.github.com` call is a 502.
export type GitHubOutage = {
  down: (isDown: boolean) => void;
  around: (handler: Handler) => Handler;
};

export function githubOutage(): GitHubOutage {
  const state = { isDown: false };

  return {
    down: (isDown) => {
      state.isDown = isDown;
    },
    around: (handler) => async (request) =>
      state.isDown && request.host !== 'github.com'
        ? answer(JSON.stringify({ message: 'Server Error' }), badGateway)
        : handler(request),
  };
}
