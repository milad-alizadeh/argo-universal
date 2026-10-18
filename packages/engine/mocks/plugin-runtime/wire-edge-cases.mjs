import { useState } from '@argo/plugin-kit';
import { jsx } from '@argo/plugin-kit/jsx-runtime';

function MixedKeys() {
  const [changed, setChanged] = useState(false);

  return jsx('Column', {
    children: [
      jsx('Button', { label: 'Change', onPress: () => setChanged(true) }, '1'),
      jsx('Text', { children: changed ? 'Changed' : 'Original' }),
      jsx('Text', { children: 'Reserved-looking key' }, '~1'),
    ],
  });
}

function ConditionalSlots() {
  const [visible, setVisible] = useState(false);

  return jsx('GroupedListItem', {
    label: 'Conditional slots',
    onPress: () => setVisible((value) => !value),
    accessories: [
      null,
      undefined,
      false,
      visible && jsx('Text', { children: 'Optional' }, 'optional'),
      jsx('Text', { children: 'Always' }, 'always'),
    ],
  });
}

export function register(argo) {
  argo.pages.register('/mixed', MixedKeys);
  argo.pages.register('/conditional', ConditionalSlots);
}
