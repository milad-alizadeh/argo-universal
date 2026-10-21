import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import { stepMarks } from '#features/setup';
import { ScrollFadeView } from '#lib/product/scroll-fade/scroll-fade';
import { AgentStepView } from './agent-step';
import { GitHubStepView } from './github-step';
import type { OnboardingViewProps } from './onboarding-props';
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

function OnboardingHeader({
  serverName,
}: Pick<OnboardingViewProps, 'serverName'>): React.JSX.Element {
  return (
    <View className="gap-2">
      {serverName !== undefined && <ServerRunning name={serverName} />}
      <Text role="title" accessibilityRole="heading" aria-level={1}>
        Set up Argo
      </Text>
      <Text role="secondary" className="text-muted-foreground">
        {lede}
      </Text>
    </View>
  );
}

function OnboardingSteps(props: OnboardingViewProps): React.JSX.Element {
  const marks = stepMarks(props.agent, props.github);

  return (
    <View>
      <AgentStepView {...props} mark={marks.agent} />
      <GitHubStepView {...props} mark={marks.github} />
      <ProjectStepView {...props} mark={marks.project} />
    </View>
  );
}

// What a Server with no Projects shows on the desktop: three steps to the first Session, centred in the window.
export function OnboardingView(props: OnboardingViewProps): React.JSX.Element {
  return (
    <ScrollFadeView
      className="bg-content"
      surfaceClassName="bg-content"
      contentContainerClassName="grow items-center justify-center px-gutter py-12"
    >
      <View className="w-full max-w-130 gap-6">
        <OnboardingHeader serverName={props.serverName} />
        <OnboardingSteps {...props} />
      </View>
    </ScrollFadeView>
  );
}
