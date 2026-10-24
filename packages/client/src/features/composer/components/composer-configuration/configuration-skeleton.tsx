import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useState, type ReactElement, type ReactNode } from 'react';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  currentEffort,
  otherSelections,
  selection,
  switches,
} from './configuration-values';

// How many rows each of Configure's two sections holds, beside the Agent row that stays put.
export interface ConfigurationRows {
  choices: number;
  tuning: number;
}

function rowsOf(configuration: ComposerConfigurationProps): ConfigurationRows {
  const model = selection(configuration, 'model') ? 1 : 0;
  const effort = currentEffort(configuration).selected ? 1 : 0;

  return {
    choices: model + otherSelections(configuration).length,
    tuning: switches(configuration).length + effort,
  };
}

// Before any Agent has answered: a Model row, a switch and Effort, which is what most Agents send.
const firstRows: ConfigurationRows = { choices: 1, tuning: 2 };

const sameRows = (a: ConfigurationRows, b: ConfigurationRows): boolean =>
  a.choices === b.choices && a.tuning === b.tuning;

/*
 * How many rows the skeleton stands in for. Every Agent sends settings of its own, so how many the one
 * being chosen will send cannot be known; the Agent before it is the closest guess there is, and keeping
 * its count leaves each row where the reader last saw it instead of emptying the card and filling it
 * again a moment later — which is what made the Effort slider jump (owner, 2026-10-20).
 */
export function useConfigurationRows(
  configuration: ComposerConfigurationProps,
  loading: boolean,
): ConfigurationRows {
  const [retained, setRetained] = useState(firstRows);
  const current = rowsOf(configuration);

  if (loading) return retained;

  if (!sameRows(retained, current)) setRetained(current);

  return current;
}

/*
 * A loading row is a bar as wide as the title it stands in for, so these are widths rather than words:
 * none of them is shown, and the Agent's own names arrive with its settings.
 */
const choiceTitles = ['Model', 'Reasoning', 'Response style', 'Sandbox'];

const tuningTitles = ['Fast mode', 'Effort'];

const titleAt = (titles: string[], index: number): string =>
  titles.at(index) ?? titles.at(-1) ?? '';

// Calls, not components: a Section reads its rows by element type.
function skeletonRows(titles: string[], count: number): ReactElement[] {
  return Array.from({ length: count }, (_unused, index) => (
    <FieldGroup.Value
      key={index}
      loading
      title={titleAt(titles, index)}
      value=""
    />
  ));
}

interface LoadingProps {
  rows: ConfigurationRows;
  // The Agent row keeps its place and its press: it is Argo's own, and it is how the reader got here.
  agent: ReactNode;
}

// Configure's sections while an Agent's settings are on their way, as many rows as the last one had.
export function loadingSections(props: LoadingProps): ReactElement[] {
  const sections = [
    <FieldGroup.Section key="choices">
      {props.agent}
      {skeletonRows(choiceTitles, props.rows.choices)}
    </FieldGroup.Section>,
  ];

  if (props.rows.tuning > 0)
    sections.push(
      <FieldGroup.Section key="tuning">
        {skeletonRows(tuningTitles, props.rows.tuning)}
      </FieldGroup.Section>,
    );

  return sections;
}
