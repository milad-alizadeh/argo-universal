import type * as React from 'react';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { PhoneMenuButton } from '../phone-menu-button';
import { shellSections } from '../shell-sections';
import type { PhoneSectionHeaderProps } from './phone-section-header-props';

// The web's header row for a narrow window: ☰, the section's title, and its items.
export function PhoneSectionHeader({
  section,
  header,
}: PhoneSectionHeaderProps): React.JSX.Element {
  return (
    <ScreenHeader
      title={shellSections[section].title}
      left={<PhoneMenuButton />}
      {...header}
    />
  );
}
