import { z } from 'zod';

// One microphone or speaker on an App's Device.
export const VoiceAudioDevice = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
});

export type VoiceAudioDevice = z.infer<typeof VoiceAudioDevice>;

// The microphones and speakers an App's Device has, and the ones it chose; null follows the system's.
export const VoiceDeviceReport = z.strictObject({
  microphones: z.array(VoiceAudioDevice),
  speakers: z.array(VoiceAudioDevice),
  microphone: z.string().nullable(),
  speaker: z.string().nullable(),
});

export type VoiceDeviceReport = z.infer<typeof VoiceDeviceReport>;

// The devices of the App a call uses, and whether it carries the running call.
export const VoiceDeviceList = VoiceDeviceReport.extend({
  carriesCall: z.boolean(),
});

export type VoiceDeviceList = z.infer<typeof VoiceDeviceList>;

// A microphone or speaker to use, or both; null follows the system's. What is left out stays.
export const VoiceDeviceChange = z
  .strictObject({
    microphone: z.string().min(1).nullable().optional(),
    speaker: z.string().min(1).nullable().optional(),
  })
  .refine(
    (change) => change.microphone !== undefined || change.speaker !== undefined,
    'Name a microphone or a speaker',
  );

export type VoiceDeviceChange = z.infer<typeof VoiceDeviceChange>;

// What the Server sends an App that reported its devices: that it listens, then each choice it is asked to make.
export const VoiceDeviceRequest = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('ready') }),
  z.strictObject({ type: z.literal('choose'), change: VoiceDeviceChange }),
]);

export type VoiceDeviceRequest = z.infer<typeof VoiceDeviceRequest>;
