import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { PlanDocument } from '#lib/product/plan-document';
import {
  planTitle,
  withoutPlanTitle,
} from '../../../../lib/product/markdown/plan-title';
import {
  type PermissionAnswers,
  type PermissionAnswersInput,
  usePermissionAnswers,
} from '../permission-request/use-permission-answers';
import {
  RequestCard,
  type RequestCardProps,
} from '../request-card/request-card';
import { PlanActions } from './plan-actions';
import { PlanHeader } from './plan-header';
import { type PlanBuild, usePlanBuild } from './use-plan-build';
import { type PlanView, usePlanView } from './use-plan-view';

// What Argo adds to a request to leave plan mode, beyond the Agent's own options.
export interface PlanRequestActions {
  onBuildInNewSession?: () => void;
  onSavePlan?: () => void;
}

export interface PlanRequestProps
  extends PermissionAnswersInput, PlanRequestActions {
  plan: string;
  error?: string;
}

// The phone sheet's title; the row under it names the plan.
const planLabel = 'Plan';

// Full page, the card and its body take the column's height.
const filling = 'min-h-0 flex-1';

// A request to leave plan mode: the plan under its title, then Build or keep planning.
export function PlanRequest(props: PlanRequestProps): ReactNode {
  const answers = usePermissionAnswers(props);
  const view = usePlanView();
  const requestId = props.request.requestId;
  const build = usePlanBuild({ ...props, requestId, answers });
  const title = planTitle(props.plan, planLabel);

  return (
    <RequestCard {...planCard({ props, answers, build, view })}>
      <PlanBody {...props} title={title} view={view} />
    </RequestCard>
  );
}

interface PlanCardParts {
  props: PlanRequestProps;
  answers: PermissionAnswers;
  build: PlanBuild;
  view: PlanView;
}

// Enter builds, Escape leaves full page, and the footer answers the request.
function planCard(parts: PlanCardParts): Omit<RequestCardProps, 'children'> {
  const { props, answers, build, view } = parts;

  return {
    surface: 'tray',
    sheetLabel: planLabel,
    state: props.state,
    error: props.error,
    ...planKeys(parts),
    ...fullPage(view.full),
    footerClassName: 'justify-end',
    actions: <PlanActions answers={answers} build={build} />,
  };
}

const planKeys = ({
  answers,
  build,
  view,
}: PlanCardParts): Pick<RequestCardProps, 'onEnter' | 'onEscape'> => ({
  onEnter: build.lead ? build.send : answers.enter,
  onEscape: view.full ? view.toggleFull : undefined,
});

const fullPage = (
  full: boolean,
): Pick<RequestCardProps, 'className' | 'bodyClassName'> =>
  full ? { className: filling, bodyClassName: filling } : {};

type PlanBodyProps = PlanRequestProps & { title: string; view: PlanView };

function PlanBody(props: PlanBodyProps): ReactNode {
  const wide = useContentWide();
  const content = withoutPlanTitle(props.plan);

  return (
    <View className={props.view.full ? filling : undefined}>
      <PlanHeader {...props} content={content} wide={wide} />
      <PlanText
        content={content}
        full={props.view.full}
        shown={wide && props.view.open}
      />
    </View>
  );
}

/*
 * Under the header, its text on the header icon's left edge; full page it scrolls in the column's height.
 * A phone reads the plan on the sheet's next page instead.
 */
function PlanText(props: {
  content: string;
  full: boolean;
  shown: boolean;
}): ReactNode {
  if (!props.shown) return null;

  return (
    <View className={`-mx-1 ${filling}`}>
      <PlanDocument
        content={props.content}
        layout={props.full ? 'fill' : 'tray'}
      />
    </View>
  );
}
