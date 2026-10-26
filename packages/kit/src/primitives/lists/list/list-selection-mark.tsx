import type { ReactElement } from 'react';
import { Icon } from '#primitives/content/icon';

export function ContentSelectionMark({
  selected,
}: {
  selected?: boolean;
}): ReactElement {
  return (
    <Icon
      name={
        selected
          ? { sf: 'checkmark.circle.fill', material: 'check_circle' }
          : { sf: 'circle', material: 'circle' }
      }
    />
  );
}
