import {
  useState,
  type Dispatch,
  type ReactElement,
  type SetStateAction,
} from 'react';
import { Pill } from '#primitives/status/pill';
import { Metadata } from './metadata';
import {
  newTagColor,
  startingTags,
  stateOptions,
} from './metadata-editable-fixtures';

type Toggle = { value: string; on: boolean };

type Tag = (typeof startingTags)[number];

const toggled = (held: string[], { value, on }: Toggle): string[] =>
  on ? [...held, value] : held.filter((name) => name !== value);

const statePicker = { title: 'State', options: stateOptions } as const;

function StateValue({ state }: { state: string }): ReactElement {
  const open = state === 'open';

  return (
    <Metadata.StatusDot
      title="State"
      text={open ? 'Open' : 'Closed'}
      tone={open ? 'success' : 'done'}
    />
  );
}

function useStateField(): ReactElement {
  const [state, setState] = useState('open');

  return (
    <Metadata.Picker {...statePicker} value={state} onValueChange={setState}>
      <StateValue state={state} />
    </Metadata.Picker>
  );
}

const tagsPicker = {
  title: 'Tags',
  multiple: true,
  searchable: true,
  createLabel: 'Create tag',
} as const;

function TagValues(props: { tags: Tag[]; tagged: string[] }): ReactElement {
  return (
    <Metadata.Pills title="Tags">
      {props.tags.flatMap((tag) =>
        props.tagged.includes(tag.value)
          ? [<Pill key={tag.value} text={tag.label} color={tag.color} />]
          : [],
      )}
    </Metadata.Pills>
  );
}

type TagEvents = {
  onToggle: (change: Toggle) => void;
  onCreate: (name: string) => void;
};

type Setter<Value> = Dispatch<SetStateAction<Value>>;

// What picking and creating a tag do to the tags held.
const tagEvents = (
  setTags: Setter<Tag[]>,
  setTagged: Setter<string[]>,
): TagEvents => ({
  onToggle: (change: Toggle): void =>
    setTagged((held) => toggled(held, change)),
  onCreate: (name: string): void => {
    setTags((all) => [
      ...all,
      { value: name, label: name, color: newTagColor },
    ]);
    setTagged((held) => [...held, name]);
  },
});

function useTagsField(): ReactElement {
  const [tags, setTags] = useState<Tag[]>(startingTags);
  const [tagged, setTagged] = useState(['alpha']);

  return (
    <Metadata.Picker
      {...tagsPicker}
      value={tagged}
      options={tags}
      {...tagEvents(setTags, setTagged)}
    >
      <TagValues tags={tags} tagged={tagged} />
    </Metadata.Picker>
  );
}

// The editable fields as a Metadata that keeps its own choices, so a story shows a pick landing: a state and tags that can be created.
export function EditableMetadata(): ReactElement {
  return (
    <Metadata>
      {useStateField()}
      {useTagsField()}
    </Metadata>
  );
}
