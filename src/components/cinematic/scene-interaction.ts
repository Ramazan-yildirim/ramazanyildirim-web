export type ScreenAnchor = {
  x: number;
  y: number;
};

export type SceneComponentTarget =
  { kind: "ram"; ramIndex: number } | { kind: "cooler" } | { kind: "gpu" };

export type SceneHover = SceneComponentTarget & {
  anchor: ScreenAnchor;
};

export type SceneInteraction =
  | { anchor: ScreenAnchor; kind: "ram"; ramIndex: number }
  | { kind: "cooler" }
  | { kind: "gpu" }
  | null;

export type RearPortId =
  | "github"
  | "linkedin"
  | "instagram"
  | "location"
  | "contact";

export type RearPortHover = {
  anchor: ScreenAnchor;
  id: RearPortId;
};
