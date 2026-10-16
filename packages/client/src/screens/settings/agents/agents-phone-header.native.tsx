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
    <>
      <ScreenHeader title={agentsTitle} hideFrom="medium" />
      <SizeClass
        compact={<AgentsNativeSearch {...props} />}
        medium={null}
        wide={null}
      />
    </>
  );
}

function AgentsNativeSearch(props: AgentsHeaderProps): React.JSX.Element {
  return (
    <PhoneSearchBar
      headerButton
      placeholder={searchLabel}
      onSearch={props.onSearch}
    />
  );
}
