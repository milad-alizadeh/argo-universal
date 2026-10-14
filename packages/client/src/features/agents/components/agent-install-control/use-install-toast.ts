import { type Toast, useToast } from '#primitives/overlays/toast';
import type {
  AgentInstallPresentation,
  InstallAction,
  ActionNotice,
} from '../../state/agent-install-types';

const doneVerbs: Record<InstallAction, string> = {
  Install: 'installed',
  Update: 'updated',
};

// Installation finishing says nothing about sign-in, so the toast never claims Ready.
const doneToast = (
  name: string,
  action: InstallAction,
  version: string,
): Toast => ({
  tone: 'success',
  title: `${name} ${doneVerbs[action]}`,
  message: `Version ${version}. Sign-in is checked separately.`,
});

const failedToast = (
  name: string,
  action: InstallAction,
  failure: string,
): Toast => ({
  tone: 'error',
  title: `Could not ${action.toLowerCase()} ${name}`,
  message: failure,
});

const noticeToast = (name: string, notice: ActionNotice): Toast => ({
  key: notice.key,
  ...(notice.result === 'installed'
    ? doneToast(name, notice.action, notice.version)
    : failedToast(name, notice.action, notice.failure)),
});

// One toast per finished installation, however often the page polls or re-renders.
export function useInstallToast(
  name: string,
  installation: AgentInstallPresentation | undefined,
): void {
  const notice = installation?.notice;
  useToast(notice && noticeToast(name, notice));
}
