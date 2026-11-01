import { admitClose } from './http-connections';
import type { RoutedSetup } from './http-server';
import type { ServerListener } from './network-listener';
import type { createRequestGuard } from './request-guard';

export type Listening = {
  guard: ReturnType<typeof createRequestGuard>;
  listener: ServerListener;
  stopAnnouncing: () => Promise<void>;
};

// After the close starts the listener never binds again, so a change racing it cannot reopen the port. The goodbye goes out first, so no App is offered a Server that is going.
export function closeWith(
  setup: RoutedSetup,
  { listener, stopAnnouncing }: Listening,
  closeConnections: () => Promise<void>,
): () => Promise<void> {
  return admitClose(setup.commandAdmission, async () => {
    listener.stop();
    await stopAnnouncing();
    await closeHttpServices(setup, closeConnections);
  });
}

async function closeHttpServices(
  setup: RoutedSetup,
  closeConnections: () => Promise<void>,
): Promise<void> {
  setup.notifications.close();
  await Promise.all([closeConnections(), setup.plugins.close()]);
}
