import { ProjectScheduleInput } from '@repo/contracts/operations';
import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { useState, type ReactElement } from 'react';

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
  onProjectChange?: (project: string) => void;
  onSubmit: (input: ProjectScheduleInput) => void;
}

const checkouts = [
  { value: 'worktree', label: 'Fresh worktree' },
  { value: 'main', label: 'Main Checkout' },
];

export function ScheduleFormView(props: ScheduleFormViewProps): ReactElement {
  const [projectId, setProjectId] = useState(props.initialProjectId);
  const [instructions, setInstructions] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [advanced, setAdvanced] = useState(props.initiallyAdvanced ?? false);
  const [checkout, setCheckout] = useState<CheckoutType>('worktree');
  const [pickedBranch, setBranch] = useState<string>();
  const [pickedAgent, setAgent] = useState<string>();
  const [validation, setValidation] = useState<string>();
  const agent =
    pickedAgent ?? props.initialAgent ?? props.agents[0]?.value ?? '';
  const branch = pickedBranch ?? props.currentBranch ?? '';

  const submit = (): void => {
    const result = ProjectScheduleInput.safeParse({
      projectId,
      agent,
      instructions,
      intervalSeconds: Number(minutes) * 60,
      checkout:
        checkout === 'main'
          ? { type: 'main' }
          : {
              type: 'worktree',
              baseBranch: branch || undefined,
            },
    });
    if (!result.success) {
      const field = result.error.issues[0]?.path[0];
      setValidation(validationMessage(field));
      return;
    }
    setValidation(undefined);
    props.onSubmit(result.data);
  };

  return (
    <Screen title="New Schedule">
      <FieldGroup disabled={props.saving}>
        <FieldGroup.Section>
          <FieldGroup.Picker
            title="Project"
            presentation="menu"
            value={projectId}
            options={props.projects}
            onValueChange={(value) => {
              setProjectId(value);
              setBranch(undefined);
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
          <FieldGroup.TextField
            title="Interval in minutes"
            value={minutes}
            keyboardType="decimal-pad"
            onChangeText={setMinutes}
          />
        </FieldGroup.Section>
        <FieldGroup.Section>
          <Button
            label="Advanced"
            variant="text"
            icon={advanced ? 'chevron-up' : 'chevron-down'}
            onPress={() => setAdvanced(!advanced)}
          />
          {advanced && (
            <>
              <FieldGroup.Picker
                title="Agent"
                presentation="menu"
                value={agent}
                options={props.agents}
                onValueChange={setAgent}
              />
              <FieldGroup.Picker
                title="Checkout"
                presentation="menu"
                value={checkout}
                options={checkouts}
                onValueChange={(value) =>
                  setCheckout(value === 'main' ? 'main' : 'worktree')
                }
              />
              {checkout === 'worktree' && (
                <FieldGroup.Picker
                  title="Base branch"
                  presentation="menu"
                  value={branch}
                  options={props.branches}
                  onValueChange={setBranch}
                />
              )}
            </>
          )}
        </FieldGroup.Section>
      </FieldGroup>
      {(validation ?? props.error) && (
        <Text accessibilityRole="alert" tone="danger">
          {validation ?? props.error}
        </Text>
      )}
      <Button
        label="Create Schedule"
        fullWidth
        loading={props.saving}
        disabled={props.saving}
        onPress={submit}
      />
    </Screen>
  );
}

function validationMessage(field: PropertyKey | undefined): string {
  if (field === 'projectId') return 'Choose a Project.';
  if (field === 'agent') return 'Choose an installed Agent.';
  if (field === 'intervalSeconds')
    return 'Enter an interval between one second and one year.';
  return 'Enter instructions for the Session.';
}
