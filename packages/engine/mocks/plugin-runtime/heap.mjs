export function register() {
  const retained = [];

  const allocationCount = 1_000_000;

  const chunkSize = 100_000;

  while (retained.length < allocationCount)
    retained.push(Array.from({ length: chunkSize }, () => 'heap fixture'));
}
