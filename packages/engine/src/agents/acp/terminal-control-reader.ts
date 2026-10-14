import type { Socket } from 'node:net';
import { createRejectionCounter } from '@repo/machine-log';
import { jsonCodec } from '../../lib/json-codec';
import { TerminalControlMessage } from './terminal-control-message';

const controlFrameLimit = 4096;

const rejections = createRejectionCounter('Terminal control');

const ControlFrame = jsonCodec(TerminalControlMessage);

export const rejectTerminalControl = (socket: Socket): void => {
  rejections.report('Rejected terminal control frame');
  socket.destroy();
};

const acceptFrame = (
  socket: Socket,
  frame: string,
  accept: (message: TerminalControlMessage) => void,
): void => {
  try {
    accept(ControlFrame.parse(frame));
  } catch {
    rejectTerminalControl(socket);
  }
};

export const observeTerminalControl = (
  socket: Socket,
  accept: (message: TerminalControlMessage) => void,
): void => {
  let text = '';
  socket.setEncoding('utf8');
  socket.on('data', (chunk: string) => {
    text += chunk;

    if (text.length > controlFrameLimit) return rejectTerminalControl(socket);
    const frames = text.split('\n');
    text = remainingFrame(frames);

    for (const frame of frames) acceptFrame(socket, frame, accept);
  });
};

const remainingFrame = (frames: string[]): string => frames.pop() ?? '';
