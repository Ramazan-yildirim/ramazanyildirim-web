import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
async function loadSource(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loadedModule = { exports: {} };
  new Function("require", "module", "exports", outputText)(require, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const { createCorePose, getCoreSequenceProgress } = await loadSource("../src/lib/core-sequence.ts");
const { createCoreTimeline } = await loadSource("../src/components/three/core-timeline.ts");
const { gsap } = require("gsap");
test.after(() => gsap.ticker.sleep());

const snapshot = (home, core, ready = true) => ({ ready, sections: { home, "ai-core": core } });
const copyPose = (pose) => Object.fromEntries(Object.keys(createCorePose()).map((key) => [key, pose[key]]));
function seek(home, core, compact = false) {
  const pose = createCorePose();
  const timeline = createCoreTimeline(pose, compact);
  timeline.progress(getCoreSequenceProgress(snapshot(home, core)));
  const result = copyPose(pose);
  timeline.kill();
  return result;
}

test("loading is hidden and initial scrolling visibly rotates and energizes the core", () => {
  assert.equal(getCoreSequenceProgress(snapshot(0, 0, false)), null);
  assert.deepEqual(seek(0, 0), createCorePose());
  const moving = seek(0.5, 0);
  assert.ok(moving.yaw > createCorePose().yaw);
  assert.ok(moving.energy > createCorePose().energy);
  assert.equal(moving.opacity, 1);
});

test("identity and later content have a hidden core, with a gradual exit", () => {
  assert.equal(seek(1, 0).opacity, 0);
  assert.equal(seek(1, 1).opacity, 0);
  const fading = seek(1, 0.82).opacity;
  assert.ok(fading > 0 && fading < 1);
});

test("activation approaches the camera and mobile reduces rotation and light", () => {
  const desktop = seek(1, 0.72);
  const mobile = seek(1, 0.72, true);
  assert.equal(desktop.opacity, 1);
  assert.ok(desktop.cameraZ < 8 && desktop.cameraZ < mobile.cameraZ);
  assert.ok(desktop.energy > mobile.energy && mobile.energy > 0.22);
  assert.ok(desktop.yaw > mobile.yaw);
});

test("backward and direct seeks restore the same pose without accumulated motion", () => {
  const pose = createCorePose();
  const timeline = createCoreTimeline(pose, false);
  for (const [home, core] of [[1, 0.72], [0.5, 0], [1, 1], [1, 0.4], [0, 0]]) {
    timeline.progress(getCoreSequenceProgress(snapshot(home, core)));
    assert.deepEqual(copyPose(pose), seek(home, core));
  }
  timeline.kill();
});

test("recreating the timeline mid-sequence is deterministic and progress is bounded", () => {
  assert.deepEqual(seek(1, 0.4), seek(1, 0.4));
  for (const [home, core] of [[-1, 0], [2, 0], [1, -2], [1, 3]]) {
    const progress = getCoreSequenceProgress(snapshot(home, core));
    assert.ok(progress >= 0 && progress <= 1);
  }
});
