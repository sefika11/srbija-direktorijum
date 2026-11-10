// Type surface of the declarative emblem scenes (plain ESM .mjs shared with tools/emblems/render.html).
import type { Group } from "three";
export type SceneBuilder = (hue: string) => Group;
export const SCENES: Record<string, SceneBuilder>;
export const HUES: Record<string, string>;
