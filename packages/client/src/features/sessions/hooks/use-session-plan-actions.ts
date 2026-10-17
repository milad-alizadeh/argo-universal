import type {
  SessionCheckoutChoice,
  SessionNewInput,
  SessionSnapshot,
} from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { type ClientError, useTRPC } from '#features/connection';
import type { PermissionRequestProps } from '#features/requests';
import { sessionHref, useNavigate } from '#lib/product/navigation/navigation';
import { showToast } from '#primitives/overlays/toast';

type PlanActions = Pick<
  PermissionRequestProps,
  'onBuildInNewSession' | 'onSavePlan'
>;

interface SessionPlan {
  sessionId: string;
  snapshot: SessionSnapshot | null | undefined;
}

// A new Session works where this one does: a new worktree from this one's branch, else the main checkout.
const sameCheckout = ({
  type,
  branch,
}: SessionSnapshot['checkout']): SessionCheckoutChoice =>
  type === 'worktree' && branch
    ? { type: 'worktree', baseBranch: branch }
    : { type: 'main' };

// The plan's Session again, in its default mode, with the plan as its first prompt.
const planSession = (
  snapshot: SessionSnapshot,
  plan: string,
): SessionNewInput => ({
  projectId: snapshot.projectId,
  agent: snapshot.agent,
  checkout: sameCheckout(snapshot.checkout),
  configOptions: [],
  prompt: [{ type: 'text', text: plan }],
});

const failed =
  (title: string) =>
  (error: ClientError): void =>
    showToast({ title, message: error.message, tone: 'danger' });

function useSavePlan(): (input: { sessionId: string; plan: string }) => void {
  const trpc = useTRPC();

  return useMutation(
    trpc.session.savePlan.mutationOptions({
      onSuccess: ({ path }) =>
        showToast({ title: 'Plan saved', message: path, tone: 'success' }),
      onError: failed("Couldn't save the plan"),
    }),
  ).mutate;
}

function useStartSession(): (input: SessionNewInput) => void {
  const trpc = useTRPC();
  const navigate = useNavigate();

  return useMutation(
    trpc.session.new.mutationOptions({
      onSuccess: ({ sessionId }) => navigate(sessionHref(sessionId)),
      onError: failed("Couldn't start a new Session"),
    }),
  ).mutate;
}

// What Argo does with a plan the Agent asks to build: save it in the Checkout, or build it in a new Session.
export function useSessionPlanActions({
  sessionId,
  snapshot,
}: SessionPlan): PlanActions {
  const save = useSavePlan();
  const start = useStartSession();
  const pending = pendingPlan(snapshot);

  return pending ? planActions({ ...pending, sessionId, save, start }) : {};
}

interface PendingPlan {
  snapshot: SessionSnapshot;
  plan: string;
}

// The plan of an open request to leave plan mode, with the Session it came from.
function pendingPlan(
  snapshot: SessionPlan['snapshot'],
): PendingPlan | undefined {
  if (!snapshot) return undefined;

  return planOf(snapshot, snapshot.pendingPermission?.plan);
}

const planOf = (
  snapshot: SessionSnapshot,
  plan: string | undefined,
): PendingPlan | undefined => (plan ? { snapshot, plan } : undefined);

interface PlanParts extends PendingPlan {
  sessionId: string;
  save: ReturnType<typeof useSavePlan>;
  start: ReturnType<typeof useStartSession>;
}

function planActions(parts: PlanParts): PlanActions {
  const { sessionId, snapshot, plan, save, start } = parts;

  return {
    onSavePlan: () => save({ sessionId, plan }),
    onBuildInNewSession: () => start(planSession(snapshot, plan)),
  };
}
