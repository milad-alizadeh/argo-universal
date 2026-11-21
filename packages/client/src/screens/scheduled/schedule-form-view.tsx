import { ProjectScheduleInput } from '@repo/contracts/operations';
import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useCentresOverlays } from '@repo/kit/primitives/overlays/centred-overlay';
import {
  DialogCancel,
  DialogFooter,
  DialogForm,
} from '@repo/kit/primitives/overlays/dialog';
import { useState, type ReactElement } from 'react';
import { cadenceOf } from './schedule-cadence-draft';
import {
  scheduleSection,
  type ScheduleCadenceFields,
} from './schedule-cadence-fields';

type Choice = { value: string; label: string };

type CheckoutType = 'worktree' | 'main';

export interface ScheduleFormViewProps {
  projects: readonly Choice[];
  agents: readonly Choice[];
  branches: readonly Choice[];
  currentBranch?: string | null;
  initialProjectId: string;
  initialAgent?: string;
  initiallyAdvanced?: boolean;
  saving?: boolean;
  error?: string;
  timing: ScheduleCadenceFields;
  onProjectChange?: (project: string) => void;
  onSubmit: (input: ProjectScheduleInput) => void;
}

const checkouts = [
  { value: 'worktree', label: 'Fresh worktree' },
  { value: 'main', label: 'Main Checkout' },
];

type TaskFields = {
  projectId: string;
  instructions: string;
  section: ReactElement;
};

function useTaskFields(
  props: ScheduleFormViewProps,
  clearBranch: () => void,
): TaskFields {
  const [projectId, setProjectId] = useState(props.initialProjectId);
  const [instructions, setInstructions] = useState('');

  const section = (
    <FieldGroup.Section title="Task">
      <FieldGroup.Picker
        title="Project"
        presentation="page"
        value={projectId}
        options={props.projects}
        onValueChange={(value) => {
          setProjectId(value);
          clearBranch();
          props.onProjectChange?.(value);
        }}
      />
      <FieldGroup.TextField
        title="Instructions"
        placeholder="What should each Session do?"
        value={instructions}
        multiline
        onChangeText={setInstructions}
      />
    </FieldGroup.Section>
  );

  return { projectId, instructions, section };
}

type AdvancedFields = {
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

function useAdvancedFields(props: ScheduleFormViewProps): AdvancedFields {
  const [advanced, show] = useState(props.initiallyAdvanced ?? false);
  const [checkout, setCheckout] = useState<CheckoutType>('worktree');
  const [pickedBranch, setBranch] = useState<string>();
  const [pickedAgent, setAgent] = useState<string>();

  const agent =
    pickedAgent ?? props.initialAgent ?? props.agents[0]?.value ?? '';

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
  props: ScheduleFormViewProps,
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
  props: ScheduleFormViewProps,
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

export function ScheduleFormView(props: ScheduleFormViewProps): ReactElement {
  const advanced = useAdvancedFields(props);
  const task = useTaskFields(props, advanced.clearBranch);
  const form = useScheduleSubmit(props, { task, advanced });
  const sheet = !useCentresOverlays();

  return (
    <DialogForm
      title={advanced.advanced ? 'Advanced' : 'New Schedule'}
      scrolls
      dismissible={!props.saving}
      showClose={!props.saving}
      footer={
        advanced.advanced ? (
          <DialogFooter>
            <Button
              label="Done"
              fullWidth={sheet}
              onPress={() => advanced.show(false)}
            />
          </DialogFooter>
        ) : (
          <ScheduleFooter
            saving={props.saving}
            fullWidth={sheet}
            error={form.error}
            onSubmit={form.submit}
          />
        )
      }
    >
      {advanced.advanced ? (
        advanced.section
      ) : (
        <>
          {task.section}
          {scheduleSection(props.timing)}
          {advanced.link}
        </>
      )}
    </DialogForm>
  );
}

type ScheduleSubmission = { error: string | undefined; submit: () => void };

function useScheduleSubmit(
  props: ScheduleFormViewProps,
  {
    task,
    advanced,
  }: {
    task: TaskFields;
    advanced: AdvancedFields;
  },
): ScheduleSubmission {
  const [validation, setValidation] = useState<string>();

  const submit = (): void => {
    const result = ProjectScheduleInput.safeParse({
      projectId: task.projectId,
      agent: advanced.agent,
      instructions: task.instructions,
      cadence: cadenceOf(props.timing.draft),
      checkout:
        advanced.checkout === 'main'
          ? { type: 'main' }
          : { type: 'worktree', baseBranch: advanced.branch || undefined },
    });

    if (!result.success) {
      setValidation(validationMessage(result.error.issues[0]?.path));

      return;
    }

    setValidation(undefined);
    props.onSubmit(result.data);
  };

  return { error: validation ?? props.error, submit };
}

function ScheduleFooter({
  saving,
  error,
  fullWidth,
  onSubmit,
}: Pick<ScheduleFormViewProps, 'saving' | 'error'> & {
  onSubmit: () => void;
  fullWidth: boolean;
}): ReactElement {
  return (
    <>
      {error && (
        <Text accessibilityRole="alert" tone="danger">
          {error}
        </Text>
      )}
      <DialogFooter>
        <DialogCancel label="Cancel" disabled={saving} />
        <Button
          label="Create Schedule"
          fullWidth={fullWidth}
          loading={saving}
          disabled={saving}
          onPress={onSubmit}
        />
      </DialogFooter>
    </>
  );
}

function validationMessage(path: readonly PropertyKey[] = []): string {
  const [field, part] = path;

  if (field === 'projectId') return 'Choose a Project.';

  if (field === 'agent') return 'Choose an installed Agent.';

  if (field === 'cadence') return cadenceError(part);

  return 'Enter instructions for the Session.';
}

function cadenceError(part: PropertyKey | undefined): string {
  if (part === 'intervalSeconds')
    return 'Enter an interval between one second and one year.';

  if (part === 'weekdays') return 'Choose at least one day.';

  if (part === 'localTime') return 'Enter a valid start time.';

  if (part === 'timeZone') return 'Choose a valid time zone.';

  return 'Enter a valid repeat interval.';
}
