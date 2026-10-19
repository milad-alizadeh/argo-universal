import { lockBrowserSuite } from '@repo/browser-suite-lock';

// Playwright global setup: a returned function is its teardown, which releases the lock.
export default lockBrowserSuite;
