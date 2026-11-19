import type { CustomVoice } from '@repo/contracts';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { ScreenSearchField } from '@repo/kit/primitives/fields/field-picker';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { useDrillBeside } from '@repo/kit/primitives/overlays/drill';
import type { ReactElement } from 'react';
import { voiceChoices, type VoiceChoice } from './voice-choices';
import {
  voicePickerCopy as copy,
  type VoicePageProps,
} from './voice-picker-props';

// How tall the popover's rows grow before they scroll.
const popoverHeight = 360;

// A popover holds a menu's plain rows that grow to fit; a pushed page the grouped rows of the Settings around it.
const popoverLook = {
  appearance: 'plain',
  fit: true,
  maxHeight: popoverHeight,
} as const;

const pageLook = { appearance: 'grouped' } as const;

const listLook = (beside: boolean): typeof popoverLook | typeof pageLook =>
  beside ? popoverLook : pageLook;

// The search heads the rows, where the List gives it the rows' inset; a pushed page's header holds it instead.
function PageSearch(props: VoicePageProps): ReactElement | null {
  if (!props.onQueryChange) return null;

  return (
    <ScreenSearchField
      label={copy.search}
      placeholder={copy.search}
      value={props.query}
      onChangeText={props.onQueryChange}
    />
  );
}

export function VoiceList(props: VoicePageProps): ReactElement {
  const choices = voiceChoices(props.settings, props.query);

  return (
    <List
      {...listLook(useDrillBeside())}
      accessibilityLabel={copy.title}
      header={<PageSearch {...props} />}
      empty={<Text role="secondary">{copy.empty}</Text>}
    >
      {choiceSection(props, copy.custom, choices.custom)}
      {addSection(props)}
      {choiceSection(props, choices.builtInTitle, choices.builtIn)}
    </List>
  );
}

function choose(props: VoicePageProps, next: readonly string[]): void {
  const [pressed] = next;

  if (pressed === undefined) return;

  props.onVoiceChange(pressed);
  props.close();
}

const selectionOf = (props: VoicePageProps): string[] =>
  props.settings.voice ? [props.settings.voice] : [];

/*
 * Called, not rendered: the List reads its sections off the `List.Section` elements it is given. A choice closes the
 * page, and the chosen row carries the check. A section the search empties is left out.
 */
function choiceSection(
  props: VoicePageProps,
  title: string,
  choices: VoiceChoice[],
): ReactElement | null {
  const select = (next: readonly string[]): void => choose(props, next);

  return choices.length > 0 ? (
    <List.Section key={title} title={title} {...singleChoice(props, select)}>
      {choices.map((choice) => voiceRow(props, choice))}
    </List.Section>
  ) : null;
}

const singleChoice = (
  props: VoicePageProps,
  select: (next: readonly string[]) => void,
): Pick<
  React.ComponentProps<typeof List.Section>,
  'selectionMode' | 'selection' | 'onSelectionChange'
> => ({
  selectionMode: 'single',
  selection: selectionOf(props),
  onSelectionChange: select,
});

// The row that adds a custom voice: it leaves the page and opens the empty form.
const addSection = (props: VoicePageProps): ReactElement => (
  <List.Section key="add">
    <ListItem
      id="new-custom-voice"
      title={copy.add}
      leading={<Icon name="add" size="md" />}
      onPress={() => {
        props.close();
        props.onEditVoice();
      }}
    />
  </List.Section>
);

const voiceRow = (props: VoicePageProps, choice: VoiceChoice): ReactElement => (
  <ListItem
    key={choice.id}
    id={choice.id}
    title={choice.label}
    subtitle={choice.subtitle}
    accessibilityLabel={choice.label}
    trailingAccessories={<RowActions {...props} choice={choice} />}
  />
);

type RowProps = VoicePageProps & { choice: VoiceChoice };

// Play on every voice; edit on the person's own, which leaves the page for the form.
function RowActions(props: RowProps): ReactElement {
  const { choice } = props;

  return (
    <>
      <RowButton
        icon="play"
        label={`Play ${choice.label}`}
        onPress={() => props.onPreviewVoice(choice.id)}
      />
      {choice.custom ? <EditButton {...props} voice={choice.custom} /> : null}
    </>
  );
}

function EditButton(props: RowProps & { voice: CustomVoice }): ReactElement {
  return (
    <RowButton
      icon="edit"
      label={`Edit ${props.voice.label}`}
      onPress={() => {
        props.close();
        props.onEditVoice(props.voice);
      }}
    />
  );
}

type RowButtonProps = {
  icon: 'play' | 'edit';
  label: string;
  onPress: () => void;
};

const RowButton = (props: RowButtonProps): ReactElement => (
  <IconButton
    icon={props.icon}
    size="sm"
    variant="secondary"
    accessibilityLabel={props.label}
    onPress={props.onPress}
  />
);
