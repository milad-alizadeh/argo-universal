import { jsx } from '@argo/plugin-kit/jsx-runtime';

function changedNode(step) {
  if (step === 0)
    return jsx('Text', { children: 'Original', tone: 'muted' }, 'kept');

  if (step === 1) return jsx('Text', { children: 'Changed' }, 'kept');

  return jsx('Button', { label: 'Changed' }, 'kept');
}

function removedNode(step, removeOnly) {
  if (!removeOnly) return null;

  return step === 0 ? jsx('Text', { children: 'Removed' }, 'removed') : null;
}

const edits = (step, removeOnly) =>
  jsx('Stack', {
    direction: 'column',
    children: [
      changedNode(removeOnly ? 0 : step),
      removedNode(step, removeOnly),
    ],
  });

const later = () => new Promise((resolve) => setTimeout(resolve, 100));

// A live page that draws `initial`, then the step after it, then holds.
const stepped = (initial, removeOnly = false) => ({
  load: async function* () {
    yield initial;
    await later();
    yield initial + 1;
    await new Promise(() => {});
  },
  render: (step) => edits(step, removeOnly),
});

export function register(argo) {
  argo.pages.define('/remove', stepped(0, true));
  argo.pages.define('/props', stepped(0));
  argo.pages.define('/replace', stepped(1));
}
