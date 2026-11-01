/*
 * The published `Noise_IK_25519_ChaChaPoly_SHA256` vector from noise-c's `tests/vector/noise-c-basic.txt`, copied byte for byte.
 * It is the one check on this implementation that does not come from this implementation: it fixes both sides' static and ephemeral keys and its own prologue, so the bytes below were produced by somebody else's code and a mistake made the same way on both of Argo's halves cannot hide from them.
 * The payloads are the names the vectors use; they carry no meaning here beyond being the plaintext the ciphertext belongs to.
 */
export const noiseIkVector = {
  prologue: 'Prologue123',
  initiatorStatic:
    'e61ef9919cde45dd5f82166404bd08e38bceb5dfdfded0a34c8df7ed542214d1',
  initiatorEphemeral:
    '893e28b9dc6ca8d611ab664754b8ceb7bac5117349a4439a6b0569da977c464a',
  responderStatic:
    '4a3acbfdb163dec651dfa3194dece676d437029c62a408b4c5ea9114246e4893',
  responderEphemeral:
    'bbdb4cdbd309f1a1f2e1456967fe288cadd6f712d65dc7b7793d5e63da6b375b',
  // The responder's static public key, which an initiator of this pattern must already hold; here, what the QR code would have carried.
  responderPublicKey:
    '31e0303fd6418d2f8c0e78b91f22e8caed0fbe48656dcf4767e4834f701b8f62',
  handshake: [
    {
      payload: 'Ludwig von Mises',
      message:
        'ca35def5ae56cec33dc2036731ab14896bc4c75dbb07a61f879f8e3afa4c7944718da798efbcd91528520204f904b9bd6c7413dccdc214d951e15253e39987f1508bfd10ad143e921328082a3c3b9e50c289f0294b29960a72f48e0b7bba2e89f20d17ed0e4dcf718749c95a941a620e',
    },
    {
      payload: 'Murray Rothbard',
      message:
        '95ebc60d2b1fa672c1f46a8aa265ef51bfe38e7ccb39ec5be34069f1448088435361e70b2ed446e6c9ec387d1d6b3b3380e00f0055bd7b310e12947fbab8e7',
    },
  ],
  // The first records of the finished channel: the initiator's, then the responder's.
  records: [
    {
      payload: 'F. A. Hayek',
      message: '050e9f3c8fac16b68dbce8f8c4bfbf6617c897f9ada4aa29aa19c8',
    },
    {
      payload: 'Carl Menger',
      message: '344233a6cabb7141d80f3da2fedc311d9646bbb0f505afe403a667',
    },
  ],
} as const;
