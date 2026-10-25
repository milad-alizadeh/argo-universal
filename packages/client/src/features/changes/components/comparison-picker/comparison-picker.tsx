import { FieldPicker } from '@repo/kit/primitives/fields/field-picker';
import type * as React from 'react';
import {
  type ChangesComparison,
  allChangesLabel,
  compareAgainstLabel,
  comparisonLabel,
  uncommittedLabel,
} from '../../view/changes-comparison';
import type { ChangesViewProps } from '../../view/changes-view-props';

export type ComparisonPickerProps = Pick<
  ChangesViewProps,
  'comparison' | 'mainBranch' | 'branches' | 'onComparisonChange'
>;

const branchPrefix = 'branch:';

const comparisonValue = (comparison: ChangesComparison): string =>
  comparison.kind === 'branch'
    ? `${branchPrefix}${comparison.branch}`
    : comparison.kind;

const fixedComparisons = new Map<string, ChangesComparison>([
  ['main', { kind: 'main' }],
  ['uncommitted', { kind: 'uncommitted' }],
]);

function comparisonOf(value: string): ChangesComparison | undefined {
  if (value.startsWith(branchPrefix))
    return { kind: 'branch', branch: value.slice(branchPrefix.length) };

  return fixedComparisons.get(value);
}

function changeComparison(value: string, props: ComparisonPickerProps): void {
  const next = comparisonOf(value);

  if (next) props.onComparisonChange(next);
}

function comparisonOptions(props: ComparisonPickerProps): Option[] {
  return [
    { value: 'main', label: allChangesLabel(props.mainBranch) },
    { value: 'uncommitted', label: uncommittedLabel },
    ...props.branches.names.map((name) => ({
      value: `${branchPrefix}${name}`,
      label: name,
      section: compareAgainstLabel,
    })),
  ];
}

type Option = { value: string; label: string; section?: string };

const pickerState = (props: ComparisonPickerProps): PickerState => ({
  summary: comparisonLabel(props.comparison, props.mainBranch),
  value: comparisonValue(props.comparison),
  options: comparisonOptions(props),
  loading: props.branches.loading,
  loadError: props.branches.loadError,
});

type PickerState = {
  summary: string;
  value: string;
  options: Option[];
  loading?: boolean;
  loadError?: string;
};

/*
 * A searchable picker drawn as a pill (ADR-0042) names the comparison. It offers All Changes and Uncommitted Changes,
 * then the branches under Compare Against, which a search narrows; choosing a branch compares from its fork point.
 * Inside the phone's Inspector sheet the choices are a pushed page; elsewhere a popover on the pill.
 */
export function ComparisonPicker(
  props: ComparisonPickerProps,
): React.JSX.Element {
  return (
    <FieldPicker
      trigger="pill"
      presentation="page"
      searchable
      title="Comparison"
      {...pickerState(props)}
      onValueChange={(value) => changeComparison(value, props)}
    />
  );
}
