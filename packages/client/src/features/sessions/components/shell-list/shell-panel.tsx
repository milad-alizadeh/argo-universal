import {
  InspectorScreen,
  InspectorScreens,
} from '@repo/kit/primitives/scaffolds/inspector';
import { ScrollFadeView } from '@repo/kit/scroll-fade/scroll-fade';
import { useClock } from '@repo/kit/use-clock';
import type { JSX, ReactElement } from 'react';
import { View } from 'react-native';
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
  const list = <ShellPanelList {...props} onSelect={openShell} />;
  const detail = shellDetail({ ...props, shell, onBack: closeShell });

  return props.listScrolls ? (
    <ShellPages list={list} detail={detail} />
  ) : (
    transientPage(list, detail)
  );
}

const transientPage = (
  list: ReactElement,
  detail: ReactElement | null,
): ReactElement => detail ?? list;

function shellDetail(
  props: ShellPanelProps & { shell?: ShellEntry; onBack: () => void },
): ReactElement | null {
  return props.shell ? <OpenShell {...props} shell={props.shell} /> : null;
}

type ShellPagesProps = { list: ReactElement; detail: ReactElement | null };

function ShellPages(props: ShellPagesProps): ReactElement {
  return (
    <InspectorScreens>
      <InspectorScreen active={!props.detail} label="Shells list">
        {props.list}
      </InspectorScreen>
      {props.detail && (
        <InspectorScreen active label="Shell output">
          {props.detail}
        </InspectorScreen>
      )}
    </InspectorScreens>
  );
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
