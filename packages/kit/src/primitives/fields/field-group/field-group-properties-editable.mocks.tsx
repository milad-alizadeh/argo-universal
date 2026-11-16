import {
  useState,
  type Dispatch,
  type ReactElement,
  type SetStateAction,
} from 'react';
import { Pill } from '#primitives/status/pill';
import { StatusDot } from '#primitives/status/status-dot';
import { FieldGroup } from './field-group';
import {
  newTagColor,
  startingTags,
  stateOptions,
} from './field-group-properties-editable-fixtures';

type Toggle = { value: string; on: boolean };

type Tag = (typeof startingTags)[number];

const toggled = (held: string[], { value, on }: Toggle): string[] =>
  on ? [...held, value] : held.filter((name) => name !== value);

const statePicker = {
  title: 'State',
  options: stateOptions,
  presentation: 'page',
} as const;

// The chosen state's label, after a dot of its tone.
function useStateField(): ReactElement {
  const [state, setState] = useState('open');

  return (
    <FieldGroup.Picker {...statePicker} value={state} onValueChange={setState}>
      <StatusDot tone={state === 'open' ? 'success' : 'done'} />
    </FieldGroup.Picker>
  );
}

const tagsPicker = {
  title: 'Tags',
  presentation: 'page',
  multiple: true,
  searchable: true,
  createLabel: 'Create tag',
} as const;

// A Pill of each tag held, in its own colour; as a function, not a component, so the Picker reads the Pills.
const tagValues = (tags: Tag[], tagged: string[]): ReactElement[] =>
  tags.flatMap((tag) =>
    tagged.includes(tag.value)
      ? [<Pill key={tag.value} text={tag.label} color={tag.color} />]
      : [],
  );

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
    <FieldGroup.Picker
      {...tagsPicker}
      value={tagged}
      options={tags}
      {...tagEvents(setTags, setTagged)}
    >
      {tagValues(tags, tagged)}
    </FieldGroup.Picker>
  );
}

// Pickers in a read-only FieldGroup that keeps its own choices, so a story shows a pick landing: a state and tags that can be created.
export function EditableProperties(): ReactElement {
  return (
    <FieldGroup>
      <FieldGroup.Section>
        {useStateField()}
        {useTagsField()}
      </FieldGroup.Section>
    </FieldGroup>
  );
}
