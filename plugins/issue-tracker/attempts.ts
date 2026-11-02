// Which sign-in the page still waits for: starting another, cancelling or leaving the page ends the one before.
export type Attempts = {
  // Starts an attempt and answers whether it has since been ended.
  begin: () => () => boolean;
  stop: () => void;
};

export function createAttempts(): Attempts {
  let current = 0;

  return {
    begin: () => {
      current += 1;

      const mine = current;

      return () => current !== mine;
    },
    stop: () => {
      current += 1;
    },
  };
}
