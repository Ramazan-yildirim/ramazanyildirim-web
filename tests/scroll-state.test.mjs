import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Compile only the pure state module with the project's existing TypeScript dependency.
const source = await readFile(new URL("../src/lib/scroll-state.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { calculateScrollSnapshot, createScrollStore, initialScrollSnapshot } =
  await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const sections = [
  { id: "home", top: 0, height: 900 },
  { id: "identity", top: 900, height: 900 },
  { id: "contact", top: 1800, height: 600 },
];
const sample = (y, direction = 1) => calculateScrollSnapshot(sections, y, 900, 1500, direction);

test("page endpoints and the short final section reach normalized endpoints", () => {
  const first = sample(0);
  assert.equal(first.progress, 0);
  assert.equal(first.sections.home, 0);
  assert.equal(first.activeSection, "home");
  assert.equal(first.coreVisible, true);

  const last = sample(1500);
  assert.equal(last.progress, 1);
  assert.equal(last.sections.contact, 1);
  assert.equal(last.activeSection, "contact");
  assert.equal(last.coreVisible, false);
});

test("backward jumps compute their actual destination without intermediate callbacks", () => {
  sample(1500);
  const back = sample(600, -1);
  assert.equal(back.activeSection, "identity");
  assert.equal(back.direction, -1);
  assert.equal(back.progress, 0.4);
  assert.equal(back.sections.contact, 0);
  assert.equal(back.coreVisible, false);
});

test("the phase 3 hero visibility boundary stays at 55 percent", () => {
  assert.equal(sample(405).coreVisible, true);
  assert.equal(sample(406).coreVisible, false);
});

test("overscroll, short documents, and missing sections produce finite bounded values", () => {
  for (const state of [
    sample(-100), sample(10000),
    calculateScrollSnapshot([{ id: "home", top: 0, height: 300 }], 0, 900, 0, 1),
    calculateScrollSnapshot([], 0, 900, 0, 1),
  ]) {
    for (const value of [state.progress, ...Object.values(state.sections)]) {
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    }
  }
  assert.equal(calculateScrollSnapshot([], 0, 900, 0, 1).coreVisible, false);
});

test("refreshed section measurements change the active destination", () => {
  assert.equal(sample(600).activeSection, "identity");
  const refreshed = calculateScrollSnapshot([
    { id: "home", top: 0, height: 1200 },
    { id: "identity", top: 1200, height: 900 },
    { id: "contact", top: 2100, height: 600 },
  ], 600, 900, 1800, 1);
  assert.equal(refreshed.activeSection, "home");
  assert.equal(refreshed.sections.identity, 0);
});

test("stores are isolated, deduplicate snapshots, reset and unsubscribe cleanly", () => {
  const store = createScrollStore();
  const other = createScrollStore();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);

  store.publish(sample(0));
  store.publish(sample(0));
  assert.equal(notifications, 1);
  assert.equal(other.getSnapshot(), initialScrollSnapshot);

  store.publish(initialScrollSnapshot);
  assert.equal(store.getSnapshot().ready, false);
  assert.equal(notifications, 2);

  unsubscribe();
  store.publish(sample(1500));
  assert.equal(notifications, 2);
});

test("short sections stay active at their anchor, with the final section active at page end", () => {
  const shortSections = [
    { id: "home", top: 0, height: 900 },
    { id: "projects", top: 900, height: 250 },
    { id: "experience", top: 1150, height: 300 },
    { id: "contact", top: 1450, height: 400 },
  ];
  const atAnchor = calculateScrollSnapshot(shortSections, 780, 900, 950, 1, 120);
  assert.equal(atAnchor.activeSection, "projects");
  const fractional = calculateScrollSnapshot(
    shortSections.map((section) => ({ ...section, top: section.top + 0.28125 })),
    780, 900, 950, 1, 120.1875,
  );
  assert.equal(fractional.activeSection, "projects");
  const atBottom = calculateScrollSnapshot(shortSections, 950, 900, 950, 1, 120);
  assert.equal(atBottom.activeSection, "contact");
});
