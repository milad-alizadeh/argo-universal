import { useId, type ReactElement, type ReactNode } from 'react';
import { BottomSheetAnchorContext } from './bottom-sheet-anchor-context';

export function BottomSheetAnchor(props: {
  children: ReactNode;
}): ReactElement {
  const anchor = `--sheet-${useId().replaceAll(':', '')}`;

  return (
    <div style={{ width: '100%', anchorName: anchor }}>
      <BottomSheetAnchorContext.Provider value={anchor}>
        {props.children}
      </BottomSheetAnchorContext.Provider>
    </div>
  );
}
