import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SessionScreen } from './SessionScreen';

afterEach(cleanup);

describe('SessionScreen', () => {
  it('shows the Session id', () => {
    render(<SessionScreen id="session-1" />);

    expect(screen.getByText('session-1')).toBeTruthy();
  });
});
