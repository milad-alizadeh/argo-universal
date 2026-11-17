import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { Text } from 'react-native';
import { TRPCProvider } from '#features/connection';
import { routeOpening } from '../utils/plugin-page-route';
import { server, type Server } from './prefetch-pages-server';
import {
  usePrefetchNavPages,
  usePrefetchRoutePage,
} from './use-prefetch-pages';

function Providers(props: {
  host: Server;
  children: React.ReactNode;
}): React.JSX.Element {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={props.host.client} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}

const waitedMs = 100;

// Reports what the Server was asked to draw once the screen has had time to ask, and again after the list answers.
function Report(props: { host: Server; answers: boolean }): React.JSX.Element {
  const [report, setReport] = React.useState('Waiting');

  React.useEffect(() => {
    const { host, answers } = props;

    void new Promise((resolve) => setTimeout(resolve, waitedMs))
      .then(() => {
        const before = [...host.draws];

        if (answers) host.answerList();

        return before;
      })
      .then((before) => setReport(`Drew before the list answered: ${before}`));
  }, [props]);

  return <Text>{report}</Text>;
}

function RouteCaller(): null {
  usePrefetchRoutePage(routeOpening(['tracker', 'issues', 'issues', '42']));

  return null;
}

// A cold deep link: the route's page is drawn while the Plugin list is still pending.
export function RouteDrawMock(): React.JSX.Element {
  const [host] = React.useState(server);

  return (
    <Providers host={host}>
      <RouteCaller />
      <Report host={host} answers={false} />
    </Providers>
  );
}

function NavCaller(): null {
  usePrefetchNavPages();

  return null;
}

// The Connection opens: each nav item's root page is drawn once the Plugin list answers.
export function NavDrawMock(): React.JSX.Element {
  const [host] = React.useState(server);

  return (
    <Providers host={host}>
      <NavCaller />
      <Report host={host} answers />
      <NavDraws host={host} />
    </Providers>
  );
}

function NavDraws({ host }: { host: Server }): React.JSX.Element {
  const [draws, setDraws] = React.useState('Waiting');

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (host.draws.length >= 2) setDraws(`Drew after: ${host.draws}`);
    }, waitedMs);

    return (): void => clearInterval(timer);
  }, [host]);

  return <Text>{draws}</Text>;
}
