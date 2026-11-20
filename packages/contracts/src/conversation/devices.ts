import { z } from 'zod';

// One microphone or speaker on an App's Device.
export const ConversationAudioDevice = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
});

export type ConversationAudioDevice = z.infer<typeof ConversationAudioDevice>;

// The microphones and speakers an App's Device has, and the ones it chose; null follows the system's.
export const ConversationDeviceReport = z.strictObject({
  microphones: z.array(ConversationAudioDevice),
  speakers: z.array(ConversationAudioDevice),
  microphone: z.string().nullable(),
  speaker: z.string().nullable(),
});

export type ConversationDeviceReport = z.infer<typeof ConversationDeviceReport>;

// The devices of the App a call uses, and whether it carries the running call.
export const ConversationDeviceList = ConversationDeviceReport.extend({
  carriesCall: z.boolean(),
});

export type ConversationDeviceList = z.infer<typeof ConversationDeviceList>;

// A microphone or speaker to use, or both; null follows the system's. What is left out stays.
export const ConversationDeviceChange = z
  .strictObject({
    microphone: z.string().min(1).nullable().optional(),
    speaker: z.string().min(1).nullable().optional(),
  })
  .refine(
    (change) => change.microphone !== undefined || change.speaker !== undefined,
    'Name a microphone or a speaker',
  );

export type ConversationDeviceChange = z.infer<typeof ConversationDeviceChange>;

// What the Server sends an App that reported its devices: that it listens, then each choice it is asked to make.
export const ConversationDeviceRequest = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('ready') }),
  z.strictObject({ type: z.literal('choose'), change: ConversationDeviceChange }),
]);

export type ConversationDeviceRequest = z.infer<typeof ConversationDeviceRequest>;
