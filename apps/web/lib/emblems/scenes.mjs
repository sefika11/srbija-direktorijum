// Entry point: re-exports the DSL and the full SCENES / HUES tables.
export * from "./dsl.mjs";
import { BUILDINGS, BUILDING_HUES } from "./buildings.mjs";
import { OBJECTS, OBJECT_HUES } from "./objects.mjs";
import { PART1 } from "./landmarks.mjs";
import { PART2 } from "./landmarks2.mjs";
import { LANDMARK_TABLE, LANDMARK_HUES } from "./landmark-table.mjs";
// landmarks: one scene per city / municipality, built from an archetype ("kind"), a style and a few options
const KINDS = { ...PART1, ...PART2 };
const LANDMARKS = Object.fromEntries(Object.entries(LANDMARK_TABLE).map(([key, [kind, style, o]]) => [key, (c) => KINDS[kind](c, style, o)]));
const LANDMARK_HUE = Object.fromEntries(Object.entries(LANDMARK_TABLE).map(([key, [kind]]) => [key, LANDMARK_HUES[kind] ?? "#8e97b8"]));
export const SCENES = { ...OBJECTS, ...BUILDINGS, ...LANDMARKS };
export const HUES = { ...OBJECT_HUES, ...BUILDING_HUES, ...LANDMARK_HUE };
