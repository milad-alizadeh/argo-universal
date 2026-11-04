import { jsx } from '@argo/plugin-kit/jsx-runtime';

const mixedKeys = (changed) =>
  jsx('Stack', {
    direction: 'column',
    children: [
      jsx('Button', { label: 'Change' }, '1'),
      jsx('Text', { children: changed ? 'Changed' : 'Original' }),
      jsx('Text', { children: 'Reserved-looking key' }, '~1'),
    ],
  });

const conditionalSlots = (visible) =>
  jsx('ListItem', {
    title: 'Conditional slots',
    trailing: [
      null,
      undefined,
      false,
      visible && jsx('Text', { children: 'Optional' }, 'optional'),
      jsx('Text', { children: 'Always' }, 'always'),
    ],
  });

const later = () => new Promise((resolve) => setTimeout(resolve, 100));

// A live page that draws false, then true, then holds.
const flipped = (render) => ({
  load: async function* () {
    yield false;
    await later();
    yield true;
    await new Promise(() => {});
  },
  render,
});

export function register(argo) {
  argo.pages.define('/mixed', flipped(mixedKeys));
  argo.pages.define('/conditional', flipped(conditionalSlots));
}
