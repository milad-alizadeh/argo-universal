import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import type { CustomAgentFormApi } from '../hooks/use-custom-agent-form';
import { CustomAgentArguments } from './custom-agent-arguments';
import { CustomAgentEnvironment } from './custom-agent-environment';
import { LabelledInput, touchedInput } from './form-field';

export type FormPartProps = { form: CustomAgentFormApi; disabled: boolean };
const executableHint = "An absolute path, or a command on the Server's PATH.";

function Dimmed({
  disabled,
  children,
}: {
  disabled: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className={disabled ? 'opacity-50' : undefined}>{children}</View>
  );
}

export function ProgramSection(props: FormPartProps): React.JSX.Element {
  return (
    <Dimmed disabled={props.disabled}>
      <SectionHeading>Program</SectionHeading>
      <ProgramFields {...props} />
      <CustomAgentArguments {...props} />
    </Dimmed>
  );
}

export function EnvironmentSection(props: FormPartProps): React.JSX.Element {
  return (
    <Dimmed disabled={props.disabled}>
      <SectionHeading>Environment variables</SectionHeading>
      <CustomAgentEnvironment {...props} />
    </Dimmed>
  );
}

function SectionHeading({ children }: { children: string }): React.JSX.Element {
  return (
    <Text role="heading" aria-level={2} className="type-heading h-8 leading-8">
      {children}
    </Text>
  );
}

function ProgramFields(props: FormPartProps): React.JSX.Element {
  return (
    <>
      <NameField {...props} />
      <ExecutableField {...props} />
    </>
  );
}

function NameField({ form, disabled }: FormPartProps): React.JSX.Element {
  return (
    <form.Field name="name">
      {(field) => (
        <LabelledInput
          label="Name"
          {...touchedInput(field)}
          disabled={disabled}
        />
      )}
    </form.Field>
  );
}

function ExecutableField({ form, disabled }: FormPartProps): React.JSX.Element {
  return (
    <form.Field name="executable">
      {(field) => (
        <LabelledInput
          mono
          label="Executable"
          hint={executableHint}
          {...touchedInput(field)}
          disabled={disabled}
        />
      )}
    </form.Field>
  );
}
