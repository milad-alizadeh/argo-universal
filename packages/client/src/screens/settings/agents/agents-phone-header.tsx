import type * as React from 'react';
import {
  ScreenHeader,
  type ScreenHeaderProps,
} from '#lib/product/navigation/screen-header';
import {
  type AgentsHeaderProps,
  agentsTitle,
  searchLabel,
} from './agents-toolbar';

export const agentsHeader = (props: AgentsHeaderProps): ScreenHeaderProps => ({
  title: agentsTitle,
  search: { placeholder: searchLabel, onChangeText: props.onSearch },
});

export function AgentsPhoneHeader(
  props: AgentsHeaderProps,
): React.JSX.Element | null {
  return <ScreenHeader {...agentsHeader(props)} />;
}
