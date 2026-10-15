import type { ReactElement } from 'react';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { PhoneMenuButton } from './phone-menu-button';

export function PlaceholderPhoneHeader({
  title,
}: {
  title: string;
}): ReactElement {
  return <ScreenHeader title={title} left={<PhoneMenuButton />} />;
}
