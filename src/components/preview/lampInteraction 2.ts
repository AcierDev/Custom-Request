import type { TimeOfDay } from "./RotatableLighting";

export const DEFAULT_LAMP_ON = true;

export function isLampEffectivelyOn(
  timeOfDay: TimeOfDay,
  lampOn: boolean,
) {
  return timeOfDay === "night" && lampOn;
}

export function toggleLampAtTimeOfDay(
  timeOfDay: TimeOfDay,
  lampOn: boolean,
) {
  return timeOfDay === "night" ? !lampOn : lampOn;
}
