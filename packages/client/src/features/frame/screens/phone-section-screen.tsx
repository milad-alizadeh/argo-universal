import type * as React from 'react';
import type { Section } from '../../../lib/product/navigation/sections';
import { PhoneSectionView } from '../components/phone-section-view';
import { useSectionList } from './section-list';

export interface PhoneSectionScreenProps {
  section: Section;
}

// A phone section root: the section's connected list in `PhoneSectionView`.
export function PhoneSectionScreen({
  section,
}: PhoneSectionScreenProps): React.JSX.Element {
  const { phoneHeader, list } = useSectionList(section);
  return (
    <PhoneSectionView section={section} header={phoneHeader} list={list} />
  );
}
