// Once running, blocks its thread for good.
export function register() {
  setTimeout(() => {
    while (true) {}
  }, 500);
}
