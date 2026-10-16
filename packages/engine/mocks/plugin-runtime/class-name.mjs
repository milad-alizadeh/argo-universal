import { Text } from '@argo/plugin-kit';
import { jsx } from '@argo/plugin-kit/jsx-runtime';

export function register(argo) {
  argo.pages.register('/', () =>
    jsx(Text, { className: 'p-4', children: 'Hi' }),
  );
}
