import type { JSX } from 'react';
import { View } from 'react-native';
import { useClock } from '#lib/generic/use-clock';
import { ScrollFadeView } from '../../../../lib/generic/scroll-fade/scroll-fade';
import { ShellList } from './shell-list';
import type { ShellEntry, ShellViewProps } from './shell-list-types';
import { ShellOutput } from './shell-output';
import { ShellOutputHeader } from './shell-output-header';
import { useOpenShell } from './use-open-shell';

export type ShellPanelProps = ShellViewProps & { listScrolls?: boolean };

type OpenProps = ShellPanelProps & { shell: ShellEntry; onBack: () => void };

// An open Shell fills the panel: its own header over the output, which scrolls on its own.
function OpenShell({ shell, onBack, ...props }: OpenProps): JSX.Element {
  const now = useClock(shell.status === 'running', props.now);

  return (
    <View className="flex-1">
      <ShellOutputHeader
        shell={shell}
        onBack={onBack}
        onStop={props.onStop}
        now={now}
      />
      <ShellOutput shell={shell} output={props.output} now={props.now} />
    </View>
  );
}

// The Inspector's Shells tab: the Session's Shells, and one Shell's output in their place.
export function ShellPanel(props: ShellPanelProps): JSX.Element {
  const [shell, openShell, closeShell] = useOpenShell(props);

  if (!shell) return <ShellPanelList {...props} onSelect={openShell} />;

  return <OpenShell {...props} shell={shell} onBack={closeShell} />;
}

function ShellPanelList(props: ShellPanelProps): JSX.Element {
  const list = <ShellList {...props} />;

  return props.listScrolls ? (
    <ScrollFadeView
      testID="desktop-inspector-scroll"
      contentContainerClassName="grow"
    >
      {list}
    </ScrollFadeView>
  ) : (
    list
  );
}
