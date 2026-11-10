// Entry point: re-exports the DSL and the full SCENES / HUES tables.
export * from "./dsl.mjs";
import { BUILDINGS, BUILDING_HUES } from "./buildings.mjs";
import { OBJECTS, OBJECT_HUES } from "./objects.mjs";
export const SCENES = { ...OBJECTS, ...BUILDINGS };
export const HUES = { ...OBJECT_HUES, ...BUILDING_HUES };
