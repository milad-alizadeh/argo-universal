import type * as React from 'react';
import { useState } from 'react';
import { Action, ActionList } from './index';

const choices = {
  Status: ['Active', 'Archived'],
  Layout: ['Regular', 'Compact'],
} as const;

type Chosen = Record<string, string>;

const defaultChoices = {
  Status: 'Active',
  Layout: 'Regular',
} satisfies Chosen;

const changed = (chosen: Chosen): boolean =>
  Object.entries(defaultChoices).some(
    ([section, value]) => chosen[section] !== value,
  );

const changedDot = {
  kind: 'status',
  tone: 'accent',
  label: 'Changed',
} as const;

const filterAction = (chosen: Chosen) =>
  ({
    label: 'Filter',
    icon: 'filters',
    badge: changed(chosen) ? changedDot : undefined,
  }) as const;

interface ChoiceFilterProps {
  chosen: Chosen;
  onChoose: (section: string, option: string) => void;
}

// Paper's Choice (filter): a submenu Action whose Sections are each one single choice; the dot shows while any choice is not its default.
export function ChoiceFilter({
  chosen,
  onChoose,
}: ChoiceFilterProps): React.JSX.Element {
  return (
    <ActionList>
      <Action key="filter" {...filterAction(chosen)}>
        {Object.entries(choices).map(([section, options]) =>
          choiceSection({ section, options, chosen, onChoose }),
        )}
      </Action>
    </ActionList>
  );
}

export function ChoiceExample(): React.JSX.Element {
  const [chosen, setChosen] = useState<Chosen>({
    Status: 'Active',
    Layout: 'Compact',
  });

  return (
    <ChoiceFilter
      chosen={chosen}
      onChoose={(section, option) =>
        setChosen({ ...chosen, [section]: option })
      }
    />
  );
}

interface ChoiceSectionProps extends ChoiceFilterProps {
  section: string;
  options: readonly string[];
}

function choiceSection(props: ChoiceSectionProps): React.JSX.Element {
  return (
    <ActionList.Section key={props.section} title={props.section}>
      {props.options.map((option) => (
        <Action
          key={option}
          label={option}
          selected={props.chosen[props.section] === option}
          onPress={() => props.onChoose(props.section, option)}
        />
      ))}
    </ActionList.Section>
  );
}
