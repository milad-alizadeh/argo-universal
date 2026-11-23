import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { SectionModal } from './section-modal';

export interface SectionModalPageProps {
  modal?: Omit<ComponentProps<typeof SectionModal>, 'children'>;
  children: ReactNode;
  renderPage: (children: ReactNode) => ReactElement;
}

export function SectionModalPage({
  children,
  modal,
  renderPage,
}: SectionModalPageProps): ReactElement {
  return modal ? (
    <SectionModal {...modal}>{children}</SectionModal>
  ) : (
    renderPage(children)
  );
}
