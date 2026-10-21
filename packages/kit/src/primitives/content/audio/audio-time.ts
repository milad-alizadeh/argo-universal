const secondsPerMinute = 60;

const secondsPerHour = 3600;

const pad = (value: number): string => String(value).padStart(2, '0');

// Clock time, such as 0:07, 3:12 or 1:02:05.
export function clockTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / secondsPerHour);
  const minutes = Math.floor((whole % secondsPerHour) / secondsPerMinute);
  const rest = pad(whole % secondsPerMinute);

  return hours > 0 ? `${hours}:${pad(minutes)}:${rest}` : `${minutes}:${rest}`;
}
