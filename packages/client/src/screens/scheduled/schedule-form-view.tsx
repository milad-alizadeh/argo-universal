import {
  ProjectScheduleInput,
  type ProjectSchedule,
} from '@repo/contracts/operations';
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
import {
  useAdvancedFields,
  type AdvancedFields,
} from './schedule-advanced-fields';
import { cadenceOf } from './schedule-cadence-draft';
import {
  scheduleSection,
  type ScheduleCadenceFields,
} from './schedule-cadence-fields';

type Choice = { value: string; label: string };

export interface ScheduleFormViewProps {
  projects: readonly Choice[];
  agents: readonly Choice[];
  branches: readonly Choice[];
  currentBranch?: string | null;
  initialProjectId: string;
  initialAgent?: string;
  initiallyAdvanced?: boolean;
  editing?: ProjectSchedule;
  saving?: boolean;
  error?: string;
  timing: ScheduleCadenceFields;
  onProjectChange?: (project: string) => void;
  onSubmit: (input: ProjectScheduleInput) => void;
}

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

  const [instructions, setInstructions] = useState(
    props.editing?.instructions ?? '',
  );

  const section = (
    <FieldGroup.Section title="Task">
      {props.editing ? (
        <FieldGroup.Value
          title="Project"
          value={
            props.projects.find(({ value }) => value === projectId)?.label ??
            projectId
          }
        />
      ) : (
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
      )}
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

export function ScheduleFormView(props: ScheduleFormViewProps): ReactElement {
  const advanced = useAdvancedFields(props);
  const task = useTaskFields(props, advanced.clearBranch);
  const form = useScheduleSubmit(props, { task, advanced });
  const sheet = !useCentresOverlays();

  return (
    <DialogForm
      title={advanced.advanced ? 'Advanced' : formTitle(props.editing)}
      size="lg"
      sheetHeader
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
            editing={props.editing}
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
      configOptions:
        props.editing?.agent === advanced.agent
          ? props.editing.configOptions
          : undefined,
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
  editing,
  onSubmit,
}: Pick<ScheduleFormViewProps, 'saving' | 'error' | 'editing'> & {
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
          label={editing ? 'Save Schedule' : 'Create Schedule'}
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

const formTitle = (editing: ProjectSchedule | undefined): string =>
  editing ? 'Edit Schedule' : 'New Schedule';

function cadenceError(part: PropertyKey | undefined): string {
  if (part === 'intervalSeconds')
    return 'Enter an interval between one second and one year.';

  if (part === 'weekdays') return 'Choose at least one day.';

  if (part === 'localTime') return 'Enter a valid start time.';

  if (part === 'timeZone') return 'Choose a valid time zone.';

  return 'Enter a valid repeat interval.';
}
