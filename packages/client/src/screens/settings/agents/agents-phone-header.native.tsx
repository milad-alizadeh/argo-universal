import type * as React from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { PhoneSearchBar } from '#lib/product/navigation/phone-search-bar';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import {
  type AgentsHeaderProps,
  agentsTitle,
  searchLabel,
} from './agents-toolbar';

export function AgentsPhoneHeader(
  props: AgentsHeaderProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <>
      <ScreenHeader title={agentsTitle} />
      <PhoneSearchBar placeholder={searchLabel} onSearch={props.onSearch} />
    </>
  );
}
