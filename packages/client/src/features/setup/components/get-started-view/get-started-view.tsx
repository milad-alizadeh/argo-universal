import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { ScrollFadeView } from '#lib/product/scroll-fade/scroll-fade';
import { Button } from '../../../../lib/generic/primitives/buttons/button/button';
import { stepMarks } from '../../state/get-started';
import { AgentStepView } from './agent-step';
import type { GetStartedViewProps } from './get-started-props';
import { GitHubStepView } from './github-step';
import { ProjectStepView } from './project-step';

function ServerRunning({ name }: { name: string }): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="size-1.5 rounded-full bg-success" />
      <Text role="secondary" className="text-muted-foreground">
        Server running on {name}
      </Text>
    </View>
  );
}

const lede =
  'Argo runs Agents inside your Projects. Three steps and you can start your first Session.';

function GetStartedHeader({
  serverName,
}: Pick<GetStartedViewProps, 'serverName'>): React.JSX.Element {
  return (
    <View className="gap-2">
      {serverName !== undefined && <ServerRunning name={serverName} />}
      <Text role="title" semanticRole="heading" aria-level={1}>
        Set up Argo
      </Text>
      <Text role="secondary" className="text-muted-foreground">
        {lede}
      </Text>
    </View>
  );
}

function GetStartedSteps(props: GetStartedViewProps): React.JSX.Element {
  const marks = stepMarks(props.agent, props.github);
  return (
    <View>
      <AgentStepView {...props} mark={marks.agent} />
      <GitHubStepView {...props} mark={marks.github} />
      <ProjectStepView {...props} mark={marks.project} />
    </View>
  );
}

function UseOnPhoneButton({
  onUseOnPhone,
}: Pick<GetStartedViewProps, 'onUseOnPhone'>): React.JSX.Element {
  return (
    <Button
      label="Use Argo on your phone"
      icon="phone"
      variant="ghost"
      size="sm"
      onPress={onUseOnPhone}
    />
  );
}

function GetStartedFooter({
  onUseOnPhone,
}: Pick<GetStartedViewProps, 'onUseOnPhone'>): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-3">
      <Text role="secondary" className="min-w-0 flex-1 text-muted-foreground">
        You can change any of this later in Settings.
      </Text>
      <UseOnPhoneButton onUseOnPhone={onUseOnPhone} />
    </View>
  );
}

// What a Server with no Projects shows on the desktop: three steps to the first Session, centred in the window.
export function GetStartedView(props: GetStartedViewProps): React.JSX.Element {
  return (
    <ScrollFadeView
      className="bg-sidebar"
      surfaceClassName="bg-sidebar"
      contentContainerClassName="grow items-center justify-center px-gutter py-12"
    >
      <View className="w-full max-w-130 gap-6">
        <GetStartedHeader serverName={props.serverName} />
        <GetStartedSteps {...props} />
        <GetStartedFooter onUseOnPhone={props.onUseOnPhone} />
      </View>
    </ScrollFadeView>
  );
}
