import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { SplitButton } from '#primitives/buttons/split-button';
import type { PermissionAnswers } from '../permission-request/use-permission-answers';
import { RequestAction } from '../request-card/request-card';
import type { PlanBuild } from './use-plan-build';

interface PlanActionsProps {
  answers: PermissionAnswers;
  build: PlanBuild;
}

// Desktop reads keep planning then Build in a row; phone stacks Build on top.
const layouts = {
  wide: { className: 'flex-row gap-1', reversed: false },
  phone: { className: 'w-full gap-2', reversed: true },
} as const;

export function PlanActions(props: PlanActionsProps): ReactNode {
  const layout = useContentWide() ? layouts.wide : layouts.phone;

  const actions = [
    <KeepPlanning key="keep" {...props} />,
    <BuildButton key="build" {...props} />,
  ];

  return (
    <View className={layout.className}>
      {layout.reversed ? actions.toReversed() : actions}
    </View>
  );
}

function KeepPlanning({ answers }: PlanActionsProps): ReactNode {
  const reject = answers.leads.reject;

  if (!reject) return null;

  return (
    <RequestAction
      disabled={answers.inactive}
      onPress={() => answers.choose(reject)}
    >
      {answers.label(reject)}
    </RequestAction>
  );
}

function BuildButton(props: PlanActionsProps): ReactNode {
  const { answers, build } = props;

  if (!build.lead) return null;

  if (build.choices.length > 1) return <BuildSplit {...props} />;

  return (
    <RequestAction primary disabled={answers.inactive} onPress={build.send}>
      {build.label}
    </RequestAction>
  );
}

// The chevron picks how to build; the button sends it.
function BuildSplit({ answers, build }: PlanActionsProps): ReactNode {
  return (
    <SplitButton
      label={build.label}
      onPress={build.send}
      options={build.choices}
      value={build.lead?.value ?? ''}
      onValueChange={build.pick}
      menuLabel="Build options"
      primary
      disabled={answers.inactive}
      fullWidth="narrow"
    />
  );
}
