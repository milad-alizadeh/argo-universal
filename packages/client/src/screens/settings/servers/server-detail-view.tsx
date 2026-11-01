import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { oneRow } from '../one-row';
import type { ServerRow } from './server-rows';
import { serverUnpairCopy, useUnpairAsk } from './server-unpair-alert';

export type ServerDetailLoad =
  | { status: 'missing' }
  | ({ status: 'loaded'; showing: boolean } & Pick<
      ServerRow,
      'name' | 'serverDevice' | 'state'
    >);

export interface ServerDetailViewProps {
  server: ServerDetailLoad;
  onShow: () => void;
  onTryAgain: () => void;
  onPairAgain: () => void;
  onUnpair: () => void;
  onBack?: () => void;
}

type LoadedServer = Extract<ServerDetailLoad, { status: 'loaded' }>;

type LoadedProps = Omit<ServerDetailViewProps, 'server'> & {
  server: LoadedServer;
};

// One Server: its state in words, what to do about it, and the red row that unpairs this Device from it after asking.
export function ServerDetailView(
  props: ServerDetailViewProps,
): React.JSX.Element {
  return (
    <Screen title={titleOf(props.server)} onBack={props.onBack}>
      {props.server.status === 'loaded' ? (
        <LoadedServerPage {...props} server={props.server} />
      ) : (
        missingPage
      )}
    </Screen>
  );
}

const titleOf = (server: ServerDetailLoad): string =>
  server.status === 'loaded' ? server.name : 'Server';

const missingPage = oneRow(
  'This Server is not in your list. It may have been unpaired.',
);

// The page names the two failures the way the owner acts on them: Not found waits, Not allowed needs pairing again.
const statusLabels = {
  connected: 'Connected',
  connecting: 'Connecting…',
  unreachable: 'Not found',
  'not-allowed': 'Not allowed',
} as const satisfies Record<ServerRow['state'], string>;

const explanations: Partial<
  Record<ServerRow['state'], (name: string) => string>
> = {
  unreachable: (name) =>
    `This phone cannot find ${name} on this network. It may be asleep or turned off, or this phone may be on a different Wi-Fi. Your pairing is fine.`,
  'not-allowed': (name) =>
    `${name} answered, but it no longer knows this phone. It was unpaired there, or its paired Devices were reset. This phone cannot reconnect on its own.`,
};

function LoadedServerPage(props: LoadedProps): React.JSX.Element {
  const { server } = props;
  const [ask, alert] = useUnpairAsk(server, props.onUnpair);

  return (
    <>
      <FieldGroup>
        {statusSection(server)}
        {nextStep(props)}
        {!server.serverDevice && unpairSection(ask)}
      </FieldGroup>
      {alert}
    </>
  );
}

const statusSection = (server: LoadedServer): React.JSX.Element => (
  <FieldGroup.Section footer={explanations[server.state]?.(server.name)}>
    <FieldGroup.Value title="Status" value={statusLabels[server.state]} />
  </FieldGroup.Section>
);

// FieldGroup finds its sections by element type, so each is an element built here, not a component.
const nextStep = (props: LoadedProps): React.JSX.Element | null =>
  stepFor(props.server.state, props) ?? showStep(props);

const stepFor = (
  state: ServerRow['state'],
  props: LoadedProps,
): React.JSX.Element | undefined =>
  state === 'unreachable' || state === 'not-allowed'
    ? stepCopy[state](props)
    : undefined;

const showStep = (props: LoadedProps): React.JSX.Element | null =>
  props.server.showing ? null : step('Show its Sessions', props.onShow);

const stepCopy = {
  unreachable: (props: LoadedProps): React.JSX.Element =>
    step(
      'Try again',
      props.onTryAgain,
      'Wake the computer or join its Wi-Fi first. Argo reconnects on its own when it is back.',
    ),
  'not-allowed': (props: LoadedProps): React.JSX.Element =>
    step(
      'Pair again',
      props.onPairAgain,
      `Scan the code on ${props.server.name}’s screen. Your Sessions there are kept.`,
    ),
};

const step = (
  label: string,
  onPress: () => void,
  footer?: string,
): React.JSX.Element => (
  <FieldGroup.Section footer={footer}>
    <FieldGroup.Link title={label} action onPress={onPress} />
  </FieldGroup.Section>
);

const unpairSection = (onPress: () => void): React.JSX.Element => (
  <FieldGroup.Section>
    <Button
      label={serverUnpairCopy.action}
      variant="danger"
      onPress={onPress}
    />
  </FieldGroup.Section>
);
