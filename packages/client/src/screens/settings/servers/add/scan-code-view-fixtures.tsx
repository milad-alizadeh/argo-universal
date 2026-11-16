import { CodeScanner } from '@repo/kit/primitives/content/code-scanner';
import type * as React from 'react';
import { looking, noticeText, scannerWords } from './scan-notice';

// The scanner with its frame dark where a phone draws the live camera, which a browser has none of.
export const cameraFixture: React.JSX.Element = (
  <CodeScanner notice={noticeText(looking)} {...scannerWords} />
);
