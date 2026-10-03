import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createTRPCClient } from '@trpc/client';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  type Fixtures,
  fails,
  pending,
  trpcMockLink,
} from '../../mocks/trpc-mock-link';
import { TRPCProvider } from '../trpc/context';
import { ProjectsScreen } from './ProjectsScreen';

afterEach(cleanup);

const systemInfo = {
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  pid: 4242,
};

function renderWith(fixtures: Fixtures, children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const client = createTRPCClient({ links: [trpcMockLink(fixtures)] });
  return render(
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={client} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>,
  );
}

describe('ProjectsScreen', () => {
  it('shows the Server version, start time, and pid', async () => {
    renderWith(
      { 'system.info': () => systemInfo, 'system.clock': pending() },
      <ProjectsScreen />,
    );

    expect(await screen.findByText('1.2.3')).toBeTruthy();
    expect(screen.getByText('2026-10-03T00:00:00.000Z')).toBeTruthy();
    expect(screen.getByText('4242')).toBeTruthy();
  });

  it('shows the newest clock tick', async () => {
    renderWith(
      {
        'system.info': () => systemInfo,
        'system.clock': async function* () {
          yield { now: '2026-10-03T10:00:00.000Z' };
          yield { now: '2026-10-03T10:00:01.000Z' };
        },
      },
      <ProjectsScreen />,
    );

    expect(await screen.findByText('2026-10-03T10:00:01.000Z')).toBeTruthy();
  });

  it('shows loading while the Server has not answered', () => {
    renderWith(
      { 'system.info': pending(), 'system.clock': pending() },
      <ProjectsScreen />,
    );

    expect(screen.getByText('Connecting to the Server…')).toBeTruthy();
  });

  it('shows the error when system.info fails', async () => {
    renderWith(
      { 'system.info': fails('Server is down'), 'system.clock': pending() },
      <ProjectsScreen />,
    );

    expect(await screen.findByText('Server is down')).toBeTruthy();
  });
});
