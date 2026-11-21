import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useState, type ReactElement } from 'react';
import type { ScheduleFormViewProps } from './schedule-form-view';

type CheckoutType = 'worktree' | 'main';

type AdvancedOptions = Pick<
  ScheduleFormViewProps,
  | 'agents'
  | 'branches'
  | 'currentBranch'
  | 'editing'
  | 'initialAgent'
  | 'initiallyAdvanced'
>;

const checkouts = [
  { value: 'worktree', label: 'Fresh worktree' },
  { value: 'main', label: 'Main Checkout' },
];

export type AdvancedFields = {
  advanced: boolean;
  show: (open: boolean) => void;
  checkout: CheckoutType;
  agent: string;
  branch: string;
  clearBranch: () => void;
  link: ReactElement;
  section: ReactElement;
};

type AdvancedChoices = Pick<AdvancedFields, 'checkout' | 'agent' | 'branch'>;

export function useAdvancedFields(props: AdvancedOptions): AdvancedFields {
  const [advanced, show] = useState(props.initiallyAdvanced ?? false);

  const [checkout, setCheckout] = useState<CheckoutType>(
    props.editing?.checkout.type ?? 'worktree',
  );

  const [pickedBranch, setBranch] = useState(
    props.editing?.checkout.type === 'worktree'
      ? props.editing.checkout.baseBranch
      : undefined,
  );

  const [pickedAgent, setAgent] = useState<string>();

  const agent =
    pickedAgent ??
    props.editing?.agent ??
    props.initialAgent ??
    props.agents[0]?.value ??
    '';

  const branch = pickedBranch ?? props.currentBranch ?? '';
  const choices = { checkout, agent, branch };

  return {
    ...choices,
    advanced,
    show,
    clearBranch: (): void => setBranch(undefined),
    link: advancedLink(props, choices, () => show(true)),
    section: advancedSection(props, choices, {
      setAgent,
      setBranch,
      setCheckout,
    }),
  };
}

function advancedLink(
  props: AdvancedOptions,
  { agent, branch, checkout }: AdvancedChoices,
  onPress: () => void,
): ReactElement {
  const agentLabel = props.agents.find(({ value }) => value === agent)?.label;

  const checkoutLabel = checkouts.find(
    ({ value }) => value === checkout,
  )?.label;

  const summary = [
    agentLabel,
    checkout === 'worktree' ? branch : null,
    checkoutLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <FieldGroup.Section>
      <FieldGroup.Link title="Advanced" subtitle={summary} onPress={onPress} />
    </FieldGroup.Section>
  );
}

type ChangeChoices = {
  setAgent: (agent: string) => void;
  setBranch: (branch: string) => void;
  setCheckout: (checkout: CheckoutType) => void;
};

function advancedSection(
  props: AdvancedOptions,
  { agent, branch, checkout }: AdvancedChoices,
  { setAgent, setBranch, setCheckout }: ChangeChoices,
): ReactElement {
  return (
    <FieldGroup.Section>
      <FieldGroup.Picker
        title="Agent"
        presentation="menu"
        value={agent}
        options={props.agents}
        onValueChange={setAgent}
      />
      {checkout === 'worktree' && (
        <FieldGroup.Picker
          title="Branch"
          presentation="page"
          value={branch}
          options={props.branches}
          onValueChange={setBranch}
        />
      )}
      <FieldGroup.Picker
        title="Checkout"
        presentation="menu"
        value={checkout}
        options={checkouts}
        onValueChange={(value) =>
          setCheckout(value === 'main' ? 'main' : 'worktree')
        }
      />
    </FieldGroup.Section>
  );
}
