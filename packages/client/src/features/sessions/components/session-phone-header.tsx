import type * as React from 'react';
import { HeaderButton } from '#lib/product/header-button';
import { ScreenHeader } from '#lib/product/navigation/screen-header';

const phoneHeaderItems = [
  // Changed files and the Session menu get their actions in later issues.
  <HeaderButton
    key="changes"
    icon="pull-request"
    paired
    accessibilityLabel="Changes"
  />,
  <HeaderButton key="more" icon="more" paired accessibilityLabel="More" />,
];

// A narrow web window's header row: the plain title and two right items.
export function PhoneSessionHeader({
  title,
}: {
  title: string;
}): React.JSX.Element {
  return <ScreenHeader title={title} right={phoneHeaderItems} />;
}
