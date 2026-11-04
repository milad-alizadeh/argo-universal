import { Text } from '@argo/plugin-kit';
import { jsx } from '@argo/plugin-kit/jsx-runtime';

function frozenSurface(surface) {
  if (!surface) return true;

  return Object.isFrozen(surface);
}

// A Loader page that draws the context it was drawn for: the asking App's surface and the page's scope.
function load({ context: ctx }) {
  return {
    ...ctx.surface,
    projectId: ctx.projectId,
    sessionId: ctx.sessionId,
    frozen: Object.isFrozen(ctx) && frozenSurface(ctx.surface),
  };
}

const render = (shown) => jsx(Text, { children: JSON.stringify(shown) });

// A live page yields the same context once and then holds, as a log tail waits for its next line.
async function* follow(input) {
  yield load(input);
  await new Promise(() => {});
}

export function register(argo) {
  argo.pages.define('/', { load, render });
  argo.pages.define('/live', { load: follow, render });
}
