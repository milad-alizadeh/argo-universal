/*
 * A failure nobody is left to hear, such as an answer sent to a worker that already ended. Every place
 * that drops one says so with this, so the swallowed failures can be found.
 */
export const swallowed = (): undefined => undefined;
