import {
  type Toast,
  useToast,
} from '#lib/generic/primitives/overlays/toast/toast';
import {
  type ToolFacts,
  toolFactsOf,
  type ToolInstallPresentation,
  type ToolNotice,
} from '../../state/missing-tool';

type Facts = ToolFacts;

const installedToast = (facts: Facts, agent: string): Omit<Toast, 'key'> => ({
  tone: 'success',
  title: `${facts.name} installed`,
  message: `You can install ${agent} now.`,
});
const failedToast = (facts: Facts, failure: string): Omit<Toast, 'key'> => ({
  tone: 'error',
  title: `Could not install ${facts.name}`,
  message: failure,
});
const toolToast = (agent: string, notice: ToolNotice): Toast => {
  const facts = toolFactsOf(notice.tool);
  const outcome =
    notice.result === 'installed'
      ? installedToast(facts, agent)
      : failedToast(facts, notice.failure);
  return { key: notice.key, ...outcome };
};

// One toast per finished Homebrew install, however often the page re-renders; the tool is found by then.
export function useToolToast(
  agent: string,
  tool: ToolInstallPresentation | undefined,
): void {
  const notice = tool?.notice;
  useToast(notice && toolToast(agent, notice));
}
