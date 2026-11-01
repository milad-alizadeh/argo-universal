import { test } from '../fixtures';

// Diagnostic only: an attach that fails must not replace the assertion error it is reported beside.
export async function attachArrivalLog(lines: string[]): Promise<void> {
  try {
    await test.info().attach('other-page-arrivalLog', {
      body: lines.join('\n') || 'No message reached the page',
      contentType: 'text/plain',
    });
  } catch {
    // The log is lost; the caller still throws its own error.
  }
}
