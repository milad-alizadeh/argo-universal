// SHA-256 in plain TypeScript: the Server (Node) and the App (Hermes) must hash a key the same way, and only the Server has `node:crypto`. `discovery.test.ts` checks it against Node's.

const wordBits = 32;

const wordBytes = 4;

const blockBytes = 64;

const blockWords = 16;

const roundCount = 64;

const stateWords = 8;

const lengthBytes = 8;

const byteBits = 8;

const endOfMessage = 0x80;

const at = (words: ArrayLike<number>, index: number): number =>
  words[index] ?? 0;

function isPrime(value: number): boolean {
  for (let divisor = 2; divisor * divisor <= value; divisor++)
    if (value % divisor === 0) return false;

  return true;
}

function firstPrimes(count: number): number[] {
  const found: number[] = [];
  let candidate = 2;

  while (found.length < count) {
    if (isPrime(candidate)) found.push(candidate);
    candidate++;
  }

  return found;
}

// The first 32 bits of the fractional part of a root: how the standard derives its constants.
const fractionalBits = (root: number): number =>
  Math.floor((root % 1) * 2 ** wordBits);

const roundConstants = Uint32Array.from(firstPrimes(roundCount), (prime) =>
  fractionalBits(Math.cbrt(prime)),
);

const initialState = (): Uint32Array =>
  Uint32Array.from(firstPrimes(stateWords), (prime) =>
    fractionalBits(Math.sqrt(prime)),
  );

const rotateRight = (word: number, bits: number): number =>
  (word >>> bits) | (word << (wordBits - bits));

const shiftRight = (word: number, bits: number): number => word >>> bits;

interface Sigma {
  first: number;
  second: number;
  third: number;
  last: (word: number, bits: number) => number;
}

const lowerSigma0: Sigma = {
  first: 7,
  second: 18,
  third: 3,
  last: shiftRight,
};

const lowerSigma1: Sigma = {
  first: 17,
  second: 19,
  third: 10,
  last: shiftRight,
};

const upperSigma0: Sigma = {
  first: 2,
  second: 13,
  third: 22,
  last: rotateRight,
};

const upperSigma1: Sigma = {
  first: 6,
  second: 11,
  third: 25,
  last: rotateRight,
};

const sigma = (word: number, { first, second, third, last }: Sigma): number =>
  rotateRight(word, first) ^ rotateRight(word, second) ^ last(word, third);

const choose = (e: number, f: number, g: number): number => (e & f) ^ (~e & g);

const majority = (a: number, b: number, c: number): number =>
  (a & b) ^ (a & c) ^ (b & c);

// Where each working variable sits in the eight words.
const slot = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };

// How far back each earlier word of the schedule is.
const back = { block: 16, early: 15, middle: 7, late: 2 };

// The message, a 1 bit, zeros, and its length in bits as 64 bits, to a whole number of blocks.
function padded(message: Uint8Array): Uint8Array {
  const blocks = Math.ceil((message.length + lengthBytes + 1) / blockBytes);
  const bytes = new Uint8Array(blocks * blockBytes);
  const view = new DataView(bytes.buffer);
  const bits = message.length * byteBits;

  bytes.set(message);
  bytes[message.length] = endOfMessage;
  view.setUint32(bytes.length - lengthBytes, Math.floor(bits / 2 ** wordBits));
  view.setUint32(bytes.length - wordBytes, bits >>> 0);

  return bytes;
}

function extended(words: Uint32Array, index: number): number {
  const early = at(words, index - back.early);
  const late = at(words, index - back.late);

  return (
    at(words, index - back.block) +
    sigma(early, lowerSigma0) +
    at(words, index - back.middle) +
    sigma(late, lowerSigma1)
  );
}

function schedule(block: DataView): Uint32Array {
  const words = new Uint32Array(roundCount);

  for (let index = 0; index < roundCount; index++)
    words[index] =
      index < blockWords
        ? block.getUint32(index * wordBytes)
        : extended(words, index);

  return words;
}

const firstSum = (work: Uint32Array, plus: number): number => {
  const e = at(work, slot.e);

  return (
    at(work, slot.h) +
    sigma(e, upperSigma1) +
    choose(e, at(work, slot.f), at(work, slot.g)) +
    plus
  );
};

const secondSum = (work: Uint32Array): number => {
  const a = at(work, slot.a);

  return (
    sigma(a, upperSigma0) + majority(a, at(work, slot.b), at(work, slot.c))
  );
};

// One round: every variable moves one place along, and two of them take the new sums.
function step(work: Uint32Array, plus: number): void {
  const first = firstSum(work, plus);
  const second = secondSum(work);

  work.copyWithin(slot.b, slot.a, slot.h);
  work[slot.a] = first + second;
  work[slot.e] = at(work, slot.e) + first;
}

function compress(state: Uint32Array, block: DataView): void {
  const words = schedule(block);
  const work = Uint32Array.from(state);

  for (let index = 0; index < roundCount; index++)
    step(work, at(roundConstants, index) + at(words, index));

  for (const [index, word] of work.entries())
    state[index] = at(state, index) + word;
}

export function sha256(message: Uint8Array): Uint8Array {
  const state = initialState();
  const bytes = padded(message);

  for (let offset = 0; offset < bytes.length; offset += blockBytes)
    compress(state, new DataView(bytes.buffer, offset, blockBytes));

  const digest = new DataView(new ArrayBuffer(state.length * wordBytes));

  for (const [index, word] of state.entries())
    digest.setUint32(index * wordBytes, word);

  return new Uint8Array(digest.buffer);
}
