import {
  type Toast,
  useToast,
} from '../../../../lib/generic/primitives/overlays/toast/toast';
import type {
  AgentInstallPresentation,
  InstallAction,
  InstallNotice,
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
const noticeToast = (
  name: string,
  action: InstallAction,
  notice: InstallNotice,
): Toast => ({
  key: notice.key,
  ...(notice.result === 'installed'
    ? doneToast(name, action, notice.version)
    : failedToast(name, action, notice.failure)),
});
// One toast per finished installation, however often the page polls or re-renders.
export function useInstallToast(
  name: string,
  installation: AgentInstallPresentation | undefined,
): void {
  const notice = installation?.notice;
  useToast(notice && noticeToast(name, installation.action, notice));
}
