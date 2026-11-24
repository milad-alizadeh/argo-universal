// react-native-quick-crypto's surface on `node:crypto`, for tests that run the phone's cipher under Node: it re-exports the library's own `Buffer` too.
export * from 'node:crypto';

export { Buffer } from 'node:buffer';
