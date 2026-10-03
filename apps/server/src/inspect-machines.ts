import { createInspectorServer } from '@statelyai/inspect/server';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Machine Inspector is available only in development');
}

const inspector = createInspectorServer({
  port: 8080,
  autoOpen: !process.env.CI,
});
console.log('Machine Inspector: http://localhost:8080');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    inspector.stop();
    process.exit(0);
  });
}
