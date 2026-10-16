import type * as React from 'react';
import { PhoneSearchBar } from '#lib/product/navigation/phone-search-bar';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { SizeClass } from '../../../lib/generic/size-class/size-class';
import {
  type AgentsHeaderProps,
  agentsTitle,
  searchLabel,
} from './agents-toolbar';

export function AgentsPhoneHeader(
  props: AgentsHeaderProps,
): React.JSX.Element | null {
  return (
    <SizeClass only="compact">
      <ScreenHeader title={agentsTitle} />
      <PhoneSearchBar
        headerButton
        placeholder={searchLabel}
        onSearch={props.onSearch}
      />
    </SizeClass>
  );
}
