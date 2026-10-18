import { useState } from '@argo/plugin-kit';
import { jsx } from '@argo/plugin-kit/jsx-runtime';

function changedNode(step) {
  if (step === 0)
    return jsx('Text', { label: 'Original', tone: 'muted' }, 'kept');

  if (step === 1) return jsx('Text', { label: 'Changed' }, 'kept');

  return jsx('Button', { label: 'Changed' }, 'kept');
}

function Edits({ initial, removeOnly = false }) {
  const [step, setStep] = useState(initial);

  return jsx('Column', {
    children: [
      jsx(
        'Button',
        { label: 'Next', onPress: () => setStep((n) => n + 1) },
        'next',
      ),
      changedNode(removeOnly ? 0 : step),
      removedNode(step, removeOnly),
    ],
  });
}

export function register(argo) {
  argo.pages.register('/remove', () =>
    jsx(Edits, { initial: 0, removeOnly: true }),
  );
  argo.pages.register('/props', () => jsx(Edits, { initial: 0 }));
  argo.pages.register('/replace', () => jsx(Edits, { initial: 1 }));
}

function removedNode(step, removeOnly) {
  if (!removeOnly) return null;

  return step === 0 ? jsx('Text', { label: 'Removed' }, 'removed') : null;
}
