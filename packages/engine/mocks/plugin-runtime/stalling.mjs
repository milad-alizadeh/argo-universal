// Once running, blocks its thread for 4 seconds, as a Plugin does on a machine under load, then recovers.
export function register() {
  setTimeout(() => {
    const until = Date.now() + 4000;

    while (Date.now() < until) {}
  }, 500);
}
