import {
  choosingPlace,
  ListPlaceContext,
  useListPlace,
} from '@repo/kit/list-place';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import {
  FieldPickerPageFrame,
  FieldPickerPageSearch,
} from '@repo/kit/primitives/fields/field-picker';
import { Drill, type DrillProps } from '@repo/kit/primitives/overlays/drill';
import { useState, type ReactElement } from 'react';
import { chosenVoiceLabel } from './voice-choices';
import {
  voicePickerCopy,
  type VoicePageProps,
  type VoicePickerProps,
} from './voice-picker-props';
import { VoiceList } from './voice-picker-rows';

const noPress = (): void => {};

type Typed = { query: string; setQuery: (query: string) => void };

const triggerOf = (value: string): DrillProps['trigger'] => (
  <FieldGroup.Link
    title={voicePickerCopy.title}
    value={value}
    onPress={noPress}
  />
);

const drillProps = (
  props: VoicePickerProps,
  typed: Typed,
): Omit<DrillProps, 'children'> => {
  const value = chosenVoiceLabel(props.settings);

  return {
    label: voicePickerCopy.title,
    title: voicePickerCopy.title,
    value,
    disabled: props.disabled,
    trigger: triggerOf(value),
    search: searchOf(typed),
    contentScrolls: true,
  };
};

const searchOf = (typed: Typed): DrillProps['search'] => ({
  label: voicePickerCopy.search,
  value: typed.query,
  onChangeText: typed.setQuery,
});

/*
 * The Voice row and the voices it opens (Paper "2 · Picker", option A): a search over names and descriptions, the
 * person's voices with play and edit, a row to add one, then the provider's voices with play. A desktop window opens
 * them in a popover under the row; a phone pushes them as a page with the search in its header.
 */
export function VoicePicker(props: VoicePickerProps): ReactElement {
  const [query, setQuery] = useState('');
  const typed = { query, setQuery };

  return (
    <Drill {...drillProps(props, typed)} onClose={() => setQuery('')}>
      {(close, inHeader) => pageOf({ ...props, close }, typed, inHeader)}
    </Drill>
  );
}

// A pushed page's header holds the search, so the page draws none of its own.
const pageOf = (
  props: VoicePickerProps & { close: () => void },
  typed: Typed,
  inHeader: boolean,
): ReactElement => (
  <VoicePage
    {...props}
    query={typed.query}
    onQueryChange={inHeader ? undefined : typed.setQuery}
  />
);

// The search above the rows, inset as the picker's own page is; a pushed page's header holds it instead.
const pageSearch = (props: VoicePageProps): ReactElement | null =>
  props.onQueryChange ? (
    <FieldPickerPageSearch
      title="voices"
      value={props.query}
      onChange={props.onQueryChange}
    />
  ) : null;

function VoicePage(props: VoicePageProps): ReactElement {
  return (
    <FieldPickerPageFrame search={pageSearch(props)} footer={null}>
      <ListPlaceContext value={choosingPlace(useListPlace())}>
        <VoiceList {...props} />
      </ListPlaceContext>
    </FieldPickerPageFrame>
  );
}
