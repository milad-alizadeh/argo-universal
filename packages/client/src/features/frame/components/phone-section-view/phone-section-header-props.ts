import type { ReactNode } from 'react';
import type { ScreenHeaderProps } from '#lib/product/navigation/screen-header';
import type { Section } from '../../../../lib/product/navigation/sections';

export interface PhoneSectionHeaderProps {
  section: Section;
  // The web header row's trailing items and search.
  header?: Pick<ScreenHeaderProps, 'right' | 'search'>;
  // The section's own native toolbar and search bar.
  toolbar?: ReactNode;
}
