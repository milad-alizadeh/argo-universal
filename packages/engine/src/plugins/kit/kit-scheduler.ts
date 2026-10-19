/*
 * The kit's own timers, taken when the kit loads. The worker realm runs the kit
 * before it installs a Plugin test clock, so the kit keeps real time and never
 * reaches a Plugin timer; kit code schedules only through here.
 */
export const kitScheduler = { schedule: setTimeout, cancel: clearTimeout };

export type KitTimer = ReturnType<typeof setTimeout>;
