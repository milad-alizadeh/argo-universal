import { useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { SectionModal } from './section-modal';
import type { SectionModalPageProps } from './section-modal-page';

function pageHost(): HTMLDivElement {
  const host = document.createElement('div');
  host.style.cssText =
    'display:flex;flex:1;flex-direction:column;min-height:0;min-width:0';

  return host;
}

// Move the host, keeping the portal target and the drawer route's React tree stable.
export function SectionModalPage({
  children,
  modal,
  renderPage,
}: SectionModalPageProps): ReactElement {
  const [host] = useState(() =>
    typeof document === 'undefined' ? null : pageHost(),
  );

  const place = (
    <div
      ref={(slot) => {
        if (slot && host) slot.append(host);
      }}
      style={{ display: 'flex', flex: 1, minHeight: 0 }}
    />
  );

  return (
    <>
      {modal ? (
        <SectionModal {...modal}>{place}</SectionModal>
      ) : (
        renderPage(place)
      )}
      {host && createPortal(children, host)}
    </>
  );
}
