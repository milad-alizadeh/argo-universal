import { Text } from '@argo/plugin-kit';
import { jsx } from '@argo/plugin-kit/jsx-runtime';

function frozenSurface(surface) {
  if (!surface) return true;

  return Object.isFrozen(surface) && Object.isFrozen(surface.parts);
}

function content({ context: ctx }) {
  return jsx(Text, {
    children: JSON.stringify({
      ...ctx.surface,
      projectId: ctx.projectId,
      frozen: Object.isFrozen(ctx) && frozenSurface(ctx.surface),
    }),
  });
}

export function register(argo) {
  argo.pages.register('/', content);
  argo.slots.register('argo/project/details/v1', content);
}
