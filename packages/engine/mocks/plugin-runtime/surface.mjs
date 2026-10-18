import { Text } from '@argo/plugin-kit';
import { jsx } from '@argo/plugin-kit/jsx-runtime';

function content({ context: ctx }) {
  return jsx(Text, {
    children: JSON.stringify({
      platform: ctx.surface?.platform,
      parts: ctx.surface?.parts,
      projectId: ctx.projectId,
      frozen:
        Object.isFrozen(ctx) &&
        (!ctx.surface ||
          (Object.isFrozen(ctx.surface) && Object.isFrozen(ctx.surface.parts))),
    }),
  });
}

export function register(argo) {
  argo.pages.register('/', content);
  argo.slots.register('argo/project/details/v1', content);
}
