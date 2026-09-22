"use client";

/* eslint-disable react-hooks/immutability */

import { useGLTF } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AmbientLight,
  Box3,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { range, type ProgressSource } from "./scroll-progress";
import type {
  SceneComponentTarget,
  SceneHover,
  SceneInteraction,
  ScreenAnchor,
} from "./scene-interaction";

const MODEL_URL = "/models/portfolio_scene.glb";
const MODEL_SCALE = 12;
const CPU_FACE_WIDTH_SCALE = 1.0;
const CPU_FACE_HEIGHT_SCALE = 1.02;
const CPU_FACE_CORNER_RADIUS = 84;
const CPU_FACE_TEXTURE_INSET = 30;

type PcSceneProps = {
  cpuFaceCornerRadius?: number;
  cpuFaceHeightScale?: number;
  cpuFaceTextureInset?: number;
  cpuFaceWidthScale?: number;
  hoveredTarget: SceneHover | null;
  interaction: SceneInteraction;
  interactionReady: boolean;
  onCoolerClick: () => void;
  onGpuClick: () => void;
  onHoverChange: (target: SceneHover | null) => void;
  onRamClick: (ramIndex: number, anchor: ScreenAnchor) => void;
  progressSource: ProgressSource;
};

type InteractionHitboxProps = {
  enabled: boolean;
  onActivate: (anchor: ScreenAnchor) => void;
  onHoverChange: (target: SceneHover | null) => void;
  position: [number, number, number];
  size: [number, number, number];
  target: SceneComponentTarget;
};

type ObjectTransform = {
  position: Vector3;
  rotation: { x: number; y: number; z: number };
};

type EmissiveMaterial = MeshStandardMaterial & {
  userData: { originalEmissiveIntensity?: number };
};

type FadeMaterialState = {
  depthWrite: boolean;
  material: Material;
  opacity: number;
  transparent: boolean;
};

type HighlightMaterialState = {
  color: Color;
  intensity: number;
  material: MeshStandardMaterial;
};

function InteractionHitbox({
  enabled,
  onActivate,
  onHoverChange,
  position,
  size,
  target,
}: InteractionHitboxProps) {
  const { camera } = useThree();

  useEffect(() => {
    if (!enabled) document.body.style.cursor = "";

    return () => {
      document.body.style.cursor = "";
    };
  }, [enabled]);

  const getScreenAnchor = (object: Object3D): ScreenAnchor => {
    const projected = object.getWorldPosition(new Vector3()).project(camera);

    return {
      x: Math.max(3, Math.min(97, (projected.x * 0.5 + 0.5) * 100)),
      y: Math.max(3, Math.min(97, (-projected.y * 0.5 + 0.5) * 100)),
    };
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (enabled) onActivate(getScreenAnchor(event.object));
  };

  return (
    <mesh
      onClick={handleClick}
      onPointerOut={() => {
        document.body.style.cursor = "";
        onHoverChange(null);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (!enabled) return;
        document.body.style.cursor = "pointer";
        onHoverChange({
          ...target,
          anchor: getScreenAnchor(event.object),
        });
      }}
      position={position}
      visible={enabled}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial
        colorWrite={false}
        depthWrite={false}
        opacity={0}
        transparent
      />
    </mesh>
  );
}

const CPU_CLOUD_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CPU_CLOUD_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  uniform float uProgress;
  uniform float uIntro;

  float random(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    vec2 blend = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(random(cell), random(cell + vec2(1.0, 0.0)), blend.x),
      mix(random(cell + vec2(0.0, 1.0)), random(cell + vec2(1.0)), blend.x),
      blend.y
    );
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.55;
    for (int octave = 0; octave < 5; octave++) {
      value += amplitude * noise(point);
      point = point * 2.04 + vec2(9.7, 4.3);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 point = (vUv - 0.5) * 2.0;
    float distanceFromCpu = length(point);
    float turbulence = fbm(point * 3.3 + vec2(uProgress * 1.4, -uProgress));
    float innerEdge = smoothstep(0.1 + uProgress * 0.34, 0.36 + uProgress * 0.34, distanceFromCpu);
    float outerEdge = 1.0 - smoothstep(0.82, 1.34, distanceFromCpu);
    float wisps = smoothstep(0.34, 0.75, turbulence + distanceFromCpu * 0.12);
    float dissolve = 1.0 - smoothstep(0.0, 1.0, uProgress);
    float alpha = innerEdge * outerEdge * wisps * dissolve * 0.92 * uIntro;
    vec3 smokeColor = mix(vec3(0.004, 0.006, 0.008), vec3(0.045, 0.058, 0.064), turbulence);

    if (alpha < 0.012) discard;
    gl_FragColor = vec4(smokeColor, alpha);
  }
`;

function smoothstep(value: number) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function mixVector(from: Vector3, to: Vector3, amount: number) {
  return from.clone().lerp(to, amount);
}

function curveVector(
  from: Vector3,
  control: Vector3,
  to: Vector3,
  amount: number,
) {
  const inverse = 1 - amount;

  return from
    .clone()
    .multiplyScalar(inverse * inverse)
    .add(control.clone().multiplyScalar(2 * inverse * amount))
    .add(to.clone().multiplyScalar(amount * amount));
}

function cloneModel(source: Object3D) {
  const model = source.clone(true);

  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone();
  });

  return model;
}

function removeTrianglesInLocalBounds(mesh: Mesh, bounds: Box3) {
  const sourceIndex = mesh.geometry.getIndex();
  const position = mesh.geometry.getAttribute("position");

  if (!sourceIndex || !position) return 0;

  const nextIndices: number[] = [];
  const centroid = new Vector3();
  const vertex = new Vector3();
  let removedTriangles = 0;

  for (let offset = 0; offset < sourceIndex.count; offset += 3) {
    centroid.set(0, 0, 0);

    for (let corner = 0; corner < 3; corner += 1) {
      vertex.fromBufferAttribute(position, sourceIndex.getX(offset + corner));
      centroid.add(vertex);
    }

    centroid.multiplyScalar(1 / 3);

    if (bounds.containsPoint(centroid)) {
      removedTriangles += 1;
      continue;
    }

    nextIndices.push(
      sourceIndex.getX(offset),
      sourceIndex.getX(offset + 1),
      sourceIndex.getX(offset + 2),
    );
  }

  if (removedTriangles > 0) {
    const geometry = mesh.geometry.clone();
    geometry.setIndex(nextIndices);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    mesh.geometry = geometry;
  }

  return removedTriangles;
}

function getCenter(object: Object3D) {
  return new Box3().setFromObject(object).getCenter(new Vector3());
}

function createGpuCableDeformer(cable: Object3D, model: Object3D) {
  model.updateWorldMatrix(true, true);
  cable.updateWorldMatrix(true, true);
  const modelWorldInverse = model.matrixWorld.clone().invert();
  const meshStates: Array<{
    baseModelPositions: Float32Array;
    geometry: Mesh["geometry"];
    modelToMesh: Matrix4;
    position: ReturnType<Mesh["geometry"]["getAttribute"]>;
    progress: Float32Array;
    radialOffsets: Float32Array;
    weights: Float32Array;
  }> = [];

  cable.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry.clone();
    object.geometry = geometry;
    object.frustumCulled = false;
    const position = geometry.getAttribute("position");
    const meshToModel = modelWorldInverse.clone().multiply(object.matrixWorld);
    const modelToMesh = meshToModel.clone().invert();
    const baseModelPositions = new Float32Array(position.count * 3);
    const point = new Vector3();

    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index).applyMatrix4(meshToModel);
      const offset = index * 3;
      baseModelPositions[offset] = point.x;
      baseModelPositions[offset + 1] = point.y;
      baseModelPositions[offset + 2] = point.z;
    }

    meshStates.push({
      baseModelPositions,
      geometry,
      modelToMesh,
      position,
      progress: new Float32Array(position.count),
      radialOffsets: new Float32Array(position.count * 3),
      weights: new Float32Array(position.count),
    });
  });

  const mainCable = meshStates.reduce<(typeof meshStates)[number] | null>(
    (largest, candidate) =>
      !largest || candidate.position.count > largest.position.count
        ? candidate
        : largest,
    null,
  );

  if (!mainCable) {
    return {
      apply: (delta: Matrix4, tension: number) => {
        void delta;
        void tension;
      },
      dispose: () => {},
      caseEnd: new Vector3(),
      gpuEnd: new Vector3(),
      recomputeNormals: () => {},
      restLength: 0,
    };
  }

  let minimumY = Number.POSITIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;
  let minimumZ = Number.POSITIVE_INFINITY;
  let maximumZ = Number.NEGATIVE_INFINITY;
  const mainPositions = mainCable.baseModelPositions;

  for (let offset = 0; offset < mainPositions.length; offset += 3) {
    minimumY = Math.min(minimumY, mainPositions[offset + 1]);
    maximumY = Math.max(maximumY, mainPositions[offset + 1]);
    minimumZ = Math.min(minimumZ, mainPositions[offset + 2]);
    maximumZ = Math.max(maximumZ, mainPositions[offset + 2]);
  }

  const yRange = Math.max(maximumY - minimumY, 0.0001);
  const zRange = Math.max(maximumZ - minimumZ, 0.0001);
  const caseEnd = new Vector3();
  const gpuEnd = new Vector3();
  let caseVertices = 0;
  let gpuVertices = 0;

  for (let offset = 0; offset < mainPositions.length; offset += 3) {
    const x = mainPositions[offset];
    const y = mainPositions[offset + 1];
    const z = mainPositions[offset + 2];
    const endpointScore = (y - minimumY) / yRange + (z - minimumZ) / zRange;

    if (endpointScore <= 0.18) {
      caseEnd.add(new Vector3(x, y, z));
      caseVertices += 1;
    }
    if (endpointScore >= 1.82) {
      gpuEnd.add(new Vector3(x, y, z));
      gpuVertices += 1;
    }
  }

  if (caseVertices > 0) caseEnd.multiplyScalar(1 / caseVertices);
  if (gpuVertices > 0) gpuEnd.multiplyScalar(1 / gpuVertices);
  const cableAxis = gpuEnd.clone().sub(caseEnd);
  const cableLengthSquared = Math.max(cableAxis.lengthSq(), 0.000001);
  const centerlineBinCount = 64;
  const centerlineX = new Float32Array(centerlineBinCount);
  const centerlineY = new Float32Array(centerlineBinCount);
  const centerlineZ = new Float32Array(centerlineBinCount);
  const centerlineCounts = new Uint32Array(centerlineBinCount);
  const getProgress = (x: number, y: number, z: number) =>
    Math.min(
      Math.max(
        ((x - caseEnd.x) * cableAxis.x +
          (y - caseEnd.y) * cableAxis.y +
          (z - caseEnd.z) * cableAxis.z) /
          cableLengthSquared,
        0,
      ),
      1,
    );

  for (let offset = 0; offset < mainPositions.length; offset += 3) {
    const progress = getProgress(
      mainPositions[offset],
      mainPositions[offset + 1],
      mainPositions[offset + 2],
    );
    const bin = Math.min(
      Math.floor(progress * centerlineBinCount),
      centerlineBinCount - 1,
    );
    centerlineX[bin] += mainPositions[offset];
    centerlineY[bin] += mainPositions[offset + 1];
    centerlineZ[bin] += mainPositions[offset + 2];
    centerlineCounts[bin] += 1;
  }

  for (let bin = 0; bin < centerlineBinCount; bin += 1) {
    const count = centerlineCounts[bin];
    if (count === 0) continue;
    centerlineX[bin] /= count;
    centerlineY[bin] /= count;
    centerlineZ[bin] /= count;
  }

  for (let bin = 0; bin < centerlineBinCount; bin += 1) {
    if (centerlineCounts[bin] > 0) continue;
    let left = bin - 1;
    let right = bin + 1;
    while (left >= 0 && centerlineCounts[left] === 0) left -= 1;
    while (right < centerlineBinCount && centerlineCounts[right] === 0) {
      right += 1;
    }

    if (left >= 0 && right < centerlineBinCount) {
      const amount = (bin - left) / (right - left);
      centerlineX[bin] =
        centerlineX[left] + (centerlineX[right] - centerlineX[left]) * amount;
      centerlineY[bin] =
        centerlineY[left] + (centerlineY[right] - centerlineY[left]) * amount;
      centerlineZ[bin] =
        centerlineZ[left] + (centerlineZ[right] - centerlineZ[left]) * amount;
    } else if (left >= 0) {
      centerlineX[bin] = centerlineX[left];
      centerlineY[bin] = centerlineY[left];
      centerlineZ[bin] = centerlineZ[left];
    } else if (right < centerlineBinCount) {
      centerlineX[bin] = centerlineX[right];
      centerlineY[bin] = centerlineY[right];
      centerlineZ[bin] = centerlineZ[right];
    } else {
      const amount = bin / (centerlineBinCount - 1);
      centerlineX[bin] = caseEnd.x + cableAxis.x * amount;
      centerlineY[bin] = caseEnd.y + cableAxis.y * amount;
      centerlineZ[bin] = caseEnd.z + cableAxis.z * amount;
    }
  }

  centerlineX[0] = caseEnd.x;
  centerlineY[0] = caseEnd.y;
  centerlineZ[0] = caseEnd.z;
  centerlineX[centerlineBinCount - 1] = gpuEnd.x;
  centerlineY[centerlineBinCount - 1] = gpuEnd.y;
  centerlineZ[centerlineBinCount - 1] = gpuEnd.z;
  let restLength = 0;

  for (let bin = 1; bin < centerlineBinCount; bin += 1) {
    const deltaX = centerlineX[bin] - centerlineX[bin - 1];
    const deltaY = centerlineY[bin] - centerlineY[bin - 1];
    const deltaZ = centerlineZ[bin] - centerlineZ[bin - 1];
    restLength += Math.sqrt(
      deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ,
    );
  }

  const readCenterline = (
    progress: number,
    target: { x: number; y: number; z: number },
  ) => {
    const position = progress * (centerlineBinCount - 1);
    const lower = Math.floor(position);
    const upper = Math.min(lower + 1, centerlineBinCount - 1);
    const amount = position - lower;
    target.x =
      centerlineX[lower] + (centerlineX[upper] - centerlineX[lower]) * amount;
    target.y =
      centerlineY[lower] + (centerlineY[upper] - centerlineY[lower]) * amount;
    target.z =
      centerlineZ[lower] + (centerlineZ[upper] - centerlineZ[lower]) * amount;
  };
  const sampledCenter = { x: 0, y: 0, z: 0 };

  meshStates.forEach((state) => {
    const isGpuConnector = state !== mainCable;

    for (
      let offset = 0, index = 0;
      offset < state.baseModelPositions.length;
      offset += 3, index += 1
    ) {
      const rawProgress = getProgress(
        state.baseModelPositions[offset],
        state.baseModelPositions[offset + 1],
        state.baseModelPositions[offset + 2],
      );
      const progress = isGpuConnector
        ? 1
        : rawProgress <= 0.08
          ? 0
          : rawProgress >= 0.88
            ? 1
            : (rawProgress - 0.08) / 0.8;
      readCenterline(progress, sampledCenter);
      state.progress[index] = progress;
      state.weights[index] = isGpuConnector ? 1 : smoothstep(progress);
      state.radialOffsets[offset] =
        state.baseModelPositions[offset] - sampledCenter.x;
      state.radialOffsets[offset + 1] =
        state.baseModelPositions[offset + 1] - sampledCenter.y;
      state.radialOffsets[offset + 2] =
        state.baseModelPositions[offset + 2] - sampledCenter.z;
    }
  });
  const lastDeltaElements = new Float32Array(16);
  lastDeltaElements.fill(Number.NaN);
  let lastTension = Number.NaN;
  const identityRotation = new Quaternion();
  const deltaRotation = new Quaternion();
  const interpolatedRotation = new Quaternion();
  const rotationBins = new Float32Array(centerlineBinCount * 9);

  return {
    apply: (delta: Matrix4, tension: number) => {
      const deltaElements = delta.elements;
      const clampedTension = Math.min(Math.max(tension, 0), 1);
      let transformChanged = false;

      for (let index = 0; index < 16; index += 1) {
        if (Math.abs(deltaElements[index] - lastDeltaElements[index]) < 1e-7) {
          continue;
        }
        transformChanged = true;
        break;
      }
      if (!transformChanged && Math.abs(clampedTension - lastTension) < 1e-7) {
        return;
      }
      lastDeltaElements.set(deltaElements);
      lastTension = clampedTension;
      deltaRotation.setFromRotationMatrix(delta);

      for (let bin = 0; bin < centerlineBinCount; bin += 1) {
        const amount = bin / (centerlineBinCount - 1);
        interpolatedRotation
          .copy(identityRotation)
          .slerp(deltaRotation, amount);
        const x = interpolatedRotation.x;
        const y = interpolatedRotation.y;
        const z = interpolatedRotation.z;
        const w = interpolatedRotation.w;
        const offset = bin * 9;
        rotationBins[offset] = 1 - 2 * (y * y + z * z);
        rotationBins[offset + 1] = 2 * (x * y + z * w);
        rotationBins[offset + 2] = 2 * (x * z - y * w);
        rotationBins[offset + 3] = 2 * (x * y - z * w);
        rotationBins[offset + 4] = 1 - 2 * (x * x + z * z);
        rotationBins[offset + 5] = 2 * (y * z + x * w);
        rotationBins[offset + 6] = 2 * (x * z + y * w);
        rotationBins[offset + 7] = 2 * (y * z - x * w);
        rotationBins[offset + 8] = 1 - 2 * (x * x + y * y);
      }

      const movedGpuEndX =
        deltaElements[0] * gpuEnd.x +
        deltaElements[4] * gpuEnd.y +
        deltaElements[8] * gpuEnd.z +
        deltaElements[12];
      const movedGpuEndY =
        deltaElements[1] * gpuEnd.x +
        deltaElements[5] * gpuEnd.y +
        deltaElements[9] * gpuEnd.z +
        deltaElements[13];
      const movedGpuEndZ =
        deltaElements[2] * gpuEnd.x +
        deltaElements[6] * gpuEnd.y +
        deltaElements[10] * gpuEnd.z +
        deltaElements[14];

      meshStates.forEach((state) => {
        const localElements = state.modelToMesh.elements;
        const source = state.baseModelPositions;
        const radialOffsets = state.radialOffsets;

        for (
          let offset = 0, index = 0;
          offset < source.length;
          offset += 3, index += 1
        ) {
          const baseX = source[offset];
          const baseY = source[offset + 1];
          const baseZ = source[offset + 2];
          const movedX =
            deltaElements[0] * baseX +
            deltaElements[4] * baseY +
            deltaElements[8] * baseZ +
            deltaElements[12];
          const movedY =
            deltaElements[1] * baseX +
            deltaElements[5] * baseY +
            deltaElements[9] * baseZ +
            deltaElements[13];
          const movedZ =
            deltaElements[2] * baseX +
            deltaElements[6] * baseY +
            deltaElements[10] * baseZ +
            deltaElements[14];
          const weight = state.weights[index];
          const looseX = baseX + (movedX - baseX) * weight;
          const looseY = baseY + (movedY - baseY) * weight;
          const looseZ = baseZ + (movedZ - baseZ) * weight;
          const progress = state.progress[index];
          const rotationBin = Math.min(
            Math.round(progress * (centerlineBinCount - 1)),
            centerlineBinCount - 1,
          );
          const rotationOffset = rotationBin * 9;
          const radialX = radialOffsets[offset];
          const radialY = radialOffsets[offset + 1];
          const radialZ = radialOffsets[offset + 2];
          const rotatedRadialX =
            rotationBins[rotationOffset] * radialX +
            rotationBins[rotationOffset + 3] * radialY +
            rotationBins[rotationOffset + 6] * radialZ;
          const rotatedRadialY =
            rotationBins[rotationOffset + 1] * radialX +
            rotationBins[rotationOffset + 4] * radialY +
            rotationBins[rotationOffset + 7] * radialZ;
          const rotatedRadialZ =
            rotationBins[rotationOffset + 2] * radialX +
            rotationBins[rotationOffset + 5] * radialY +
            rotationBins[rotationOffset + 8] * radialZ;
          const straightX =
            caseEnd.x + (movedGpuEndX - caseEnd.x) * progress + rotatedRadialX;
          const straightY =
            caseEnd.y + (movedGpuEndY - caseEnd.y) * progress + rotatedRadialY;
          const straightZ =
            caseEnd.z + (movedGpuEndZ - caseEnd.z) * progress + rotatedRadialZ;
          const modelX = looseX + (straightX - looseX) * clampedTension;
          const modelY = looseY + (straightY - looseY) * clampedTension;
          const modelZ = looseZ + (straightZ - looseZ) * clampedTension;
          const localX =
            localElements[0] * modelX +
            localElements[4] * modelY +
            localElements[8] * modelZ +
            localElements[12];
          const localY =
            localElements[1] * modelX +
            localElements[5] * modelY +
            localElements[9] * modelZ +
            localElements[13];
          const localZ =
            localElements[2] * modelX +
            localElements[6] * modelY +
            localElements[10] * modelZ +
            localElements[14];

          state.position.setXYZ(index, localX, localY, localZ);
        }
        state.position.needsUpdate = true;
      });
    },
    dispose: () => {
      meshStates.forEach((state) => state.geometry.dispose());
    },
    caseEnd: caseEnd.clone(),
    gpuEnd: gpuEnd.clone(),
    recomputeNormals: () => {
      meshStates.forEach((state) => state.geometry.computeVertexNormals());
    },
    restLength,
  };
}

function hasEmissiveIntensity(
  material: Material,
): material is EmissiveMaterial {
  return "emissiveIntensity" in material;
}

function collectFadeMaterials(parts: Object3D[]) {
  const materials = new Set<Material>();

  parts.forEach((part) => {
    part.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const meshMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      meshMaterials.forEach((material) => materials.add(material));
    });
  });

  return [...materials].map<FadeMaterialState>((material) => ({
    depthWrite: material.depthWrite,
    material,
    opacity: material.opacity,
    transparent: material.transparent,
  }));
}

function applyMaterialFade(
  states: FadeMaterialState[],
  amount: number,
  restoreDepthWrite = true,
) {
  states.forEach((state) => {
    state.material.opacity = state.opacity * amount;
    state.material.transparent = true;
    state.material.depthWrite =
      restoreDepthWrite && state.depthWrite && amount > 0.98;
  });
}

function isolateHighlightMaterials(parts: Object3D[]) {
  const clones = new Map<Material, Material>();
  const highlighted = new Set<MeshStandardMaterial>();

  parts.forEach((part) => {
    part.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const sourceMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const isolatedMaterials = sourceMaterials.map((material) => {
        let isolated = clones.get(material);

        if (!isolated) {
          const clonedMaterial = material.clone();
          clones.set(material, clonedMaterial);
          isolated = clonedMaterial;
        }
        if (isolated instanceof MeshStandardMaterial) {
          highlighted.add(isolated);
        }
        return isolated;
      });

      object.material = Array.isArray(object.material)
        ? isolatedMaterials
        : isolatedMaterials[0]!;
    });
  });

  return [...highlighted].map<HighlightMaterialState>((material) => ({
    color: material.emissive.clone(),
    intensity: material.emissiveIntensity,
    material,
  }));
}

function collectHighlightMaterials(parts: Object3D[]) {
  const materials = new Set<MeshStandardMaterial>();

  parts.forEach((part) => {
    part.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const meshMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      meshMaterials.forEach((material) => {
        if (material instanceof MeshStandardMaterial) materials.add(material);
      });
    });
  });

  return [...materials].map<HighlightMaterialState>((material) => ({
    color: material.emissive.clone(),
    intensity: material.emissiveIntensity,
    material,
  }));
}

function addHighlightTween(
  timeline: gsap.core.Timeline,
  states: HighlightMaterialState[],
  strength: number,
  position: number,
  duration = 0.24,
) {
  states.forEach((state) => {
    const highlightedColor = state.color
      .clone()
      .lerp(new Color("#86d7e5"), strength);
    timeline.to(
      state.material.emissive,
      {
        b: highlightedColor.b,
        duration,
        ease: "power2.out",
        g: highlightedColor.g,
        r: highlightedColor.r,
      },
      position,
    );
    timeline.to(
      state.material,
      {
        duration,
        ease: "power2.out",
        emissiveIntensity: state.intensity + strength * 1.35,
      },
      position,
    );
  });
}

function addHighlightRestore(
  timeline: gsap.core.Timeline,
  states: HighlightMaterialState[],
  position: number,
  duration = 0.3,
) {
  states.forEach((state) => {
    timeline.to(
      state.material.emissive,
      {
        b: state.color.b,
        duration,
        ease: "power2.inOut",
        g: state.color.g,
        r: state.color.r,
      },
      position,
    );
    timeline.to(
      state.material,
      {
        duration,
        ease: "power2.inOut",
        emissiveIntensity: state.intensity,
      },
      position,
    );
  });
}

function createCpuCloudMaterial() {
  return new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: CPU_CLOUD_FRAGMENT_SHADER,
    side: DoubleSide,
    transparent: true,
    uniforms: {
      uIntro: { value: 0 },
      uProgress: { value: 0 },
    },
    vertexShader: CPU_CLOUD_VERTEX_SHADER,
  });
}

function createCpuFaceMaterial(cornerRadius: number, textureInset: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  if (!context) {
    return new MeshStandardMaterial({
      color: "#858e91",
      metalness: 0.78,
      roughness: 0.36,
    });
  }

  context.clearRect(0, 0, 1024, 1024);
  context.save();
  context.beginPath();
  context.roundRect(
    textureInset,
    textureInset,
    1024 - textureInset * 2,
    1024 - textureInset * 2,
    cornerRadius,
  );
  context.clip();

  const plateGradient = context.createLinearGradient(0, 0, 1024, 1024);
  plateGradient.addColorStop(0, "#343b3e");
  plateGradient.addColorStop(0.28, "#7c8588");
  plateGradient.addColorStop(0.55, "#4d5558");
  plateGradient.addColorStop(0.78, "#949c9e");
  plateGradient.addColorStop(1, "#303638");
  context.fillStyle = plateGradient;
  context.fillRect(0, 0, 1024, 1024);

  context.globalAlpha = 0.16;
  for (let line = 0; line < 1024; line += 5) {
    context.fillStyle = line % 10 === 0 ? "#f4f8f8" : "#111719";
    context.fillRect(0, line, 1024, 1);
  }
  context.globalAlpha = 1;

  const textGradient = context.createLinearGradient(290, 330, 740, 700);
  textGradient.addColorStop(0, "#1b2225");
  textGradient.addColorStop(0.42, "#4b5559");
  textGradient.addColorStop(0.68, "#2d3639");
  textGradient.addColorStop(1, "#171e21");
  context.font = "700 390px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = textGradient;
  context.fillText("RY", 512, 530);
  context.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  return new MeshStandardMaterial({
    color: "#ffffff",
    map: texture,
    metalness: 0.82,
    roughness: 0.34,
    transparent: true,
    alphaTest: 0.04,
  });
}

function createCoolingScreenMaterial() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  if (!context) {
    return new MeshStandardMaterial({
      color: "#10d9d0",
      depthWrite: false,
      emissive: "#087f83",
      emissiveIntensity: 1.4,
      metalness: 0.24,
      roughness: 0.28,
      transparent: true,
    });
  }

  context.fillStyle = "#020809";
  context.fillRect(0, 0, 1024, 1024);

  const screenGlow = context.createRadialGradient(512, 500, 70, 512, 500, 510);
  screenGlow.addColorStop(0, "rgba(17, 240, 226, 0.23)");
  screenGlow.addColorStop(0.5, "rgba(4, 112, 122, 0.12)");
  screenGlow.addColorStop(1, "rgba(0, 15, 19, 0)");
  context.fillStyle = screenGlow;
  context.fillRect(0, 0, 1024, 1024);

  const boltGradient = context.createLinearGradient(350, 250, 680, 790);
  boltGradient.addColorStop(0, "#c6fffa");
  boltGradient.addColorStop(0.35, "#35f4df");
  boltGradient.addColorStop(0.7, "#00c7ca");
  boltGradient.addColorStop(1, "#087da8");
  context.save();
  context.shadowColor = "#12e7dc";
  context.shadowBlur = 56;
  context.fillStyle = boltGradient;
  context.beginPath();
  context.moveTo(560, 170);
  context.lineTo(325, 550);
  context.lineTo(490, 550);
  context.lineTo(430, 855);
  context.lineTo(705, 435);
  context.lineTo(535, 435);
  context.closePath();
  context.fill();
  context.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 4;

  return new MeshStandardMaterial({
    color: "#ffffff",
    depthWrite: false,
    emissive: "#18d8d0",
    emissiveIntensity: 1.8,
    emissiveMap: texture,
    map: texture,
    metalness: 0.24,
    roughness: 0.26,
    transparent: true,
  });
}

export function PcScene({
  cpuFaceCornerRadius = CPU_FACE_CORNER_RADIUS,
  cpuFaceHeightScale = CPU_FACE_HEIGHT_SCALE,
  cpuFaceTextureInset = CPU_FACE_TEXTURE_INSET,
  cpuFaceWidthScale = CPU_FACE_WIDTH_SCALE,
  hoveredTarget,
  interaction,
  interactionReady,
  onCoolerClick,
  onGpuClick,
  onHoverChange,
  onRamClick,
  progressSource,
}: PcSceneProps) {
  const gltf = useGLTF(MODEL_URL);
  const preparedModel = useMemo(() => {
    const nextModel = cloneModel(gltf.scene);
    nextModel.updateMatrixWorld(true);

    const wholeCenter = getCenter(nextModel);
    const cpu = nextModel.getObjectByName("CPU");

    if (!cpu) {
      throw new Error("CPU model part could not be found.");
    }

    nextModel.remove(cpu);

    return { cpu, model: nextModel, wholeCenter };
  }, [gltf.scene]);
  const { cpu, model, wholeCenter } = preparedModel;
  const cpuCloudMaterial = useMemo(() => createCpuCloudMaterial(), []);
  const cpuFaceMaterial = useMemo(
    () => createCpuFaceMaterial(cpuFaceCornerRadius, cpuFaceTextureInset),
    [cpuFaceCornerRadius, cpuFaceTextureInset],
  );
  const coolingScreenMaterial = useMemo(
    () => createCoolingScreenMaterial(),
    [],
  );
  const rigRef = useRef<Group>(null);
  const cpuGroupRef = useRef<Group>(null);
  const ambientLightRef = useRef<AmbientLight>(null);
  const cpuLightRef = useRef<PointLight>(null);
  const directionalLightRef = useRef<DirectionalLight>(null);
  const fillLightRef = useRef<PointLight>(null);
  const fogRef = useRef<Fog>(null);
  const introRef = useRef(0);
  const lastProgressRef = useRef(0);
  const updateSceneRef = useRef<(progress: number) => void>(() => {});
  const interactionTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const introHighlightTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const hoverHighlightTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const interactionIntroPlayedRef = useRef(false);
  const interactionKindRef = useRef<SceneInteraction>(null);
  const gpuCameraAmountRef = useRef({ value: 0 });
  const coolerCameraAmountRef = useRef({ value: 0 });
  const finalCameraStateRef = useRef({
    position: new Vector3(),
    target: new Vector3(),
    topDistance: 4.2,
    viewOffset: 0,
  });
  const { camera, invalidate, size } = useThree();

  const setup = useMemo(() => {
    model.updateMatrixWorld(true);

    const motherboard = model.getObjectByName("ANAKART");
    const cooler = model.getObjectByName("SIVI_SOGUTMA_EKRAN");
    const radiator = model.getObjectByName("SIVI_SOGUTMA_FAN_KASA");
    const cable = model.getObjectByName("SIVI_SOGUTMA_KABLO");
    const hoseEnds = cable?.getObjectByName("BezierCurve005_2");
    const coolingScreen = cooler?.getObjectByName("Cube529_2");
    const motherboardSurface = motherboard?.getObjectByName("Text060_1");
    const motherboardBackdrop = motherboard?.getObjectByName("Text060_8");
    const capacitorBody = motherboard?.getObjectByName("Text060_12");
    const capacitorBase = motherboard?.getObjectByName("Text060_13");

    if (
      !motherboard ||
      !cooler ||
      !radiator ||
      !cable ||
      !(hoseEnds instanceof Mesh) ||
      !(coolingScreen instanceof Mesh) ||
      !(motherboardSurface instanceof Mesh) ||
      !(motherboardBackdrop instanceof Mesh) ||
      !(capacitorBody instanceof Mesh) ||
      !(capacitorBase instanceof Mesh)
    ) {
      throw new Error("Required PC model parts could not be found.");
    }

    const motherboardSurfaceSourceMaterial = Array.isArray(
      motherboardSurface.material,
    )
      ? motherboardSurface.material[0]
      : motherboardSurface.material;

    if (motherboardSurfaceSourceMaterial instanceof MeshStandardMaterial) {
      motherboardSurface.material = new MeshBasicMaterial({
        alphaMap: motherboardSurfaceSourceMaterial.alphaMap,
        alphaTest: motherboardSurfaceSourceMaterial.alphaTest,
        color: "#ffffff",
        map: motherboardSurfaceSourceMaterial.map,
        opacity: motherboardSurfaceSourceMaterial.opacity,
        side: motherboardSurfaceSourceMaterial.side,
        toneMapped: true,
        transparent: true,
      });
    } else if (
      !(motherboardSurfaceSourceMaterial instanceof MeshBasicMaterial)
    ) {
      throw new Error("Motherboard surface material could not be prepared.");
    }

    const motherboardBackdropSourceMaterial = Array.isArray(
      motherboardBackdrop.material,
    )
      ? motherboardBackdrop.material[0]
      : motherboardBackdrop.material;
    motherboardBackdrop.material = new MeshBasicMaterial({
      color: "#343a3d",
      opacity: motherboardBackdropSourceMaterial.opacity,
      side: motherboardBackdropSourceMaterial.side,
      toneMapped: true,
      transparent: true,
    });

    coolingScreen.material = coolingScreenMaterial;
    const screenTexture = coolingScreenMaterial.map;
    const screenUv = coolingScreen.geometry.getAttribute("uv");

    if (screenTexture && screenUv) {
      let minU = Number.POSITIVE_INFINITY;
      let minV = Number.POSITIVE_INFINITY;
      let maxU = Number.NEGATIVE_INFINITY;
      let maxV = Number.NEGATIVE_INFINITY;

      for (let index = 0; index < screenUv.count; index += 1) {
        minU = Math.min(minU, screenUv.getX(index));
        minV = Math.min(minV, screenUv.getY(index));
        maxU = Math.max(maxU, screenUv.getX(index));
        maxV = Math.max(maxV, screenUv.getY(index));
      }

      const repeatX = 1 / Math.max(maxU - minU, 0.001);
      const repeatY = 1 / Math.max(maxV - minV, 0.001);
      screenTexture.repeat.set(repeatX, repeatY);
      screenTexture.offset.set(-minU * repeatX, -minV * repeatY);
    }

    const cpuCenter = getCenter(cpu);
    const cpuBounds = new Box3().setFromObject(cpu);
    const cpuSize = cpuBounds.getSize(new Vector3());
    const localCpuCenter = new Vector3(
      cpuCenter.x - wholeCenter.x,
      cpuCenter.y - wholeCenter.y,
      cpuCenter.z - wholeCenter.z,
    );
    const cpuMeshLocalPosition = new Vector3(
      -cpuCenter.x,
      -cpuCenter.y,
      -cpuCenter.z,
    );
    const cpuFaceLocalPosition = new Vector3(
      0,
      0,
      cpuBounds.max.z - cpuCenter.z + 0.00012,
    );
    const cpuCloudLocalPosition = new Vector3(
      0,
      0,
      cpuBounds.max.z - cpuCenter.z + 0.001,
    );

    if (!motherboard.userData.rightCpuCapacitorRowHidden) {
      const hiddenCapacitorRowBounds = new Box3(
        new Vector3(-0.0349, 0.0436, Number.NEGATIVE_INFINITY),
        new Vector3(-0.0298, 0.0735, Number.POSITIVE_INFINITY),
      );
      const removedCapacitorTriangles =
        removeTrianglesInLocalBounds(capacitorBody, hiddenCapacitorRowBounds) +
        removeTrianglesInLocalBounds(capacitorBase, hiddenCapacitorRowBounds);

      if (removedCapacitorTriangles === 0) {
        throw new Error("Target motherboard capacitor row could not be found.");
      }

      motherboard.userData.rightCpuCapacitorRowHidden = true;
    }

    const coolerBasePosition = cooler.position.clone();
    const coolerBaseRotation = cooler.rotation.clone();
    const cableBasePosition = cable.position.clone();
    const cableBaseRotation = cable.rotation.clone();
    const existingGpuAssembly = model.getObjectByName("GPU_INTERACTION_GROUP");
    const existingGpuCableAnchor = model.getObjectByName("GPU_CABLE_ANCHOR");
    const rootParts = [...model.children].filter(
      (part) => part !== existingGpuAssembly && part !== existingGpuCableAnchor,
    );
    const ramParts = [1, 2, 3, 4]
      .map((index) => model.getObjectByName(`RAM_${index}`))
      .filter((part): part is Object3D => Boolean(part));
    const gpuParts = ["GPU", "GPU_FAN_1", "GPU_FAN_2", "GPU_FAN_3", "GPU_KABLO"]
      .map((name) => model.getObjectByName(name))
      .filter((part): part is Object3D => Boolean(part));
    const gpuCable = gpuParts.find((part) => part.name === "GPU_KABLO");
    const chassis = model.getObjectByName("ANAKASA");

    if (
      !chassis ||
      !gpuCable ||
      ramParts.length !== 4 ||
      gpuParts.length !== 5
    ) {
      throw new Error("Interactive PC model parts could not be found.");
    }
    gpuCable.traverse((object) => {
      object.visible = true;
      if (!(object instanceof Mesh)) return;
      object.frustumCulled = false;
      object.morphTargetInfluences?.fill(0);
    });
    if (existingGpuCableAnchor instanceof Group) {
      if (gpuCable.parent !== model) model.attach(gpuCable);
      model.remove(existingGpuCableAnchor);
    }
    if (gpuCable.parent !== model) model.attach(gpuCable);

    const ramBounds = ramParts.map((part) => {
      const bounds = new Box3().setFromObject(part);
      return {
        center: bounds.getCenter(new Vector3()).sub(wholeCenter),
        size: bounds.getSize(new Vector3()),
      };
    });
    const ramTargets = ramBounds.map(({ center, size: partSize }, index) => {
      const leftGap =
        index > 0
          ? Math.abs(center.x - ramBounds[index - 1].center.x)
          : Number.POSITIVE_INFINITY;
      const rightGap =
        index < ramBounds.length - 1
          ? Math.abs(center.x - ramBounds[index + 1].center.x)
          : Number.POSITIVE_INFINITY;
      const nearestGap = Math.min(leftGap, rightGap);
      const maximumWidth = Number.isFinite(nearestGap)
        ? nearestGap * 0.88
        : partSize.x * 1.12;

      return {
        position: center.toArray() as [number, number, number],
        size: [
          Math.min(Math.max(partSize.x * 1.12, 0.0059), maximumWidth),
          Math.max(partSize.y * 1.15, 0.11),
          Math.max(partSize.z * 1.35, 0.052),
        ] as [number, number, number],
      };
    });
    const ramBaseTransforms = ramParts.map<ObjectTransform>((part) => ({
      position: part.position.clone(),
      rotation: {
        x: part.rotation.x,
        y: part.rotation.y,
        z: part.rotation.z,
      },
    }));

    const gpuBodyParts = gpuParts.filter((part) => part.name !== "GPU_KABLO");
    const gpuBounds = new Box3();
    gpuBodyParts.forEach((part) => gpuBounds.expandByObject(part));
    const gpuCenter = gpuBounds.getCenter(new Vector3());
    const gpuSize = gpuBounds.getSize(new Vector3());
    const gpuAssembly =
      existingGpuAssembly instanceof Group ? existingGpuAssembly : new Group();

    if (!(existingGpuAssembly instanceof Group)) {
      gpuAssembly.name = "GPU_INTERACTION_GROUP";
      gpuAssembly.position.copy(gpuCenter);
      model.add(gpuAssembly);
      model.updateMatrixWorld(true);
    }
    gpuBodyParts.forEach((part) => {
      if (part.parent !== gpuAssembly) gpuAssembly.attach(part);
    });

    const gpuAssemblyBasePosition = gpuAssembly.position.clone();
    const gpuAssemblyBaseRotation = {
      x: gpuAssembly.rotation.x,
      y: gpuAssembly.rotation.y,
      z: gpuAssembly.rotation.z,
    };
    gpuAssembly.updateMatrix();
    const gpuAssemblyBaseMatrixInverse = gpuAssembly.matrix.clone().invert();
    const gpuAssemblyDelta = new Matrix4();
    const gpuCableTension = { value: 0 };
    const gpuCableDeformer = createGpuCableDeformer(gpuCable, model);
    const gpuAssemblyOpenPosition = gpuAssemblyBasePosition
      .clone()
      .add(new Vector3(0, -0.09, 0.16));

    gpuAssembly.position.copy(gpuAssemblyOpenPosition);
    gpuAssembly.rotation.set(
      gpuAssemblyBaseRotation.x + Math.PI,
      gpuAssemblyBaseRotation.y,
      gpuAssemblyBaseRotation.z,
    );
    gpuAssembly.updateMatrix();
    gpuAssemblyDelta
      .copy(gpuAssembly.matrix)
      .multiply(gpuAssemblyBaseMatrixInverse);
    const openCableAxis = gpuCableDeformer.gpuEnd
      .clone()
      .applyMatrix4(gpuAssemblyDelta)
      .sub(gpuCableDeformer.caseEnd);
    const openCableLength = openCableAxis.length();

    if (
      openCableLength > 0.0001 &&
      gpuCableDeformer.restLength > openCableLength
    ) {
      gpuAssemblyOpenPosition.add(
        openCableAxis
          .normalize()
          .multiplyScalar(gpuCableDeformer.restLength - openCableLength),
      );
    }

    gpuAssembly.position.copy(gpuAssemblyBasePosition);
    gpuAssembly.rotation.set(
      gpuAssemblyBaseRotation.x,
      gpuAssemblyBaseRotation.y,
      gpuAssemblyBaseRotation.z,
    );
    gpuAssembly.updateMatrix();
    const updateGpuCableDeformation = () => {
      gpuAssembly.updateMatrix();
      gpuAssemblyDelta
        .copy(gpuAssembly.matrix)
        .multiply(gpuAssemblyBaseMatrixInverse);
      gpuCableDeformer.apply(gpuAssemblyDelta, gpuCableTension.value);
    };
    updateGpuCableDeformation();
    const gpuTarget = {
      position: gpuCenter.clone().sub(wholeCenter).toArray() as [
        number,
        number,
        number,
      ],
      size: [
        Math.max(gpuSize.x, 0.23),
        Math.max(gpuSize.y, 0.055),
        Math.max(gpuSize.z, 0.18),
      ] as [number, number, number],
    };
    const coolerBounds = new Box3().setFromObject(coolingScreen);
    const coolerTarget = {
      position: coolerBounds
        .getCenter(new Vector3())
        .sub(wholeCenter)
        .toArray() as [number, number, number],
      size: [0.046, 0.056, 0.03] as [number, number, number],
    };
    const ramHighlightMaterials = ramParts.map((part) =>
      isolateHighlightMaterials([part]),
    );
    const gpuBodyHighlightMaterials = isolateHighlightMaterials(gpuBodyParts);
    const gpuCableHighlightMaterials = isolateHighlightMaterials([gpuCable]);
    const gpuHighlightMaterials = [
      ...gpuBodyHighlightMaterials,
      ...gpuCableHighlightMaterials,
    ];
    const coolerHighlightMaterials = collectHighlightMaterials([coolingScreen]);

    const coolingParts = new Set(
      rootParts.filter((part) => part.name.startsWith("SIVI_SOGUTMA_")),
    );
    coolingParts.forEach((part) => {
      const renderOrder = part === cooler ? 7 : part === cable ? 6 : 5;
      part.traverse((object) => {
        if (object instanceof Mesh) object.renderOrder = renderOrder;
      });
    });
    const allCaseParts = [...new Set([...rootParts, ...gpuParts])].filter(
      (part) =>
        part !== motherboard && part !== chassis && !coolingParts.has(part),
    );
    const earlyCaseParts = allCaseParts.filter(
      (part) =>
        part.name.startsWith("RAM_") ||
        part.name.startsWith("YAN_FAN_") ||
        part.name.startsWith("GPU") ||
        part.name.startsWith("PORT_") ||
        part.name.startsWith("ALT_PORT_") ||
        part.name.startsWith("KASA_DIS_BUTTON_"),
    );
    const earlyCasePartSet = new Set(earlyCaseParts);
    const caseParts = allCaseParts.filter(
      (part) => !earlyCasePartSet.has(part),
    );
    const motherboardBackdropFadeMaterials = collectFadeMaterials([
      motherboardSurface,
      motherboardBackdrop,
    ]);
    const motherboardBackdropMaterials = new Set(
      motherboardBackdropFadeMaterials.map((state) => state.material),
    );
    const motherboardFadeMaterials = collectFadeMaterials([motherboard]).filter(
      (state) => !motherboardBackdropMaterials.has(state.material),
    );
    const chassisFadeMaterials = collectFadeMaterials([chassis]);
    const earlyCaseFadeMaterials = collectFadeMaterials(earlyCaseParts);
    const caseFadeMaterials = collectFadeMaterials(caseParts);
    const coolingScreenFadeMaterials = collectFadeMaterials([coolingScreen]);
    const hoseEndFadeMaterials = collectFadeMaterials([hoseEnds]);
    const separatelyFadedCoolingMaterials = new Set(
      [...coolingScreenFadeMaterials, ...hoseEndFadeMaterials].map(
        (state) => state.material,
      ),
    );
    const coolingFadeMaterials = collectFadeMaterials([...coolingParts]).filter(
      (state) => !separatelyFadedCoolingMaterials.has(state.material),
    );
    const emissiveMaterials: EmissiveMaterial[] = [];
    const cpuMaterials = new Set<Material>();
    const cpuCloudSize = Math.max(cpuSize.x, cpuSize.y) * 3.9;

    cpu.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const displayMaterials = materials.map((material) => {
        if (!(material instanceof MeshStandardMaterial)) {
          material.transparent = true;
          material.opacity = 1;
          cpuMaterials.add(material);
          return material;
        }

        const displayMaterial = new MeshBasicMaterial({
          color: "#aeb4b6",
          map: material.map,
          side: DoubleSide,
          toneMapped: true,
          transparent: true,
          opacity: 1,
        });
        displayMaterial.name = `${material.name}-cpu-display`;
        cpuMaterials.add(displayMaterial);
        return displayMaterial;
      });

      object.material = Array.isArray(object.material)
        ? displayMaterials
        : displayMaterials[0];
    });

    const cpuFadeMaterials = collectFadeMaterials([cpu]);

    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        if (cpuMaterials.has(material) || !hasEmissiveIntensity(material))
          return;
        material.userData.originalEmissiveIntensity =
          material.emissiveIntensity;
        emissiveMaterials.push(material);
      });
    });

    model.position.copy(wholeCenter).multiplyScalar(-1);

    return {
      cable,
      cableBasePosition,
      cableBaseRotation,
      caseFadeMaterials,
      caseParts,
      chassis,
      chassisFadeMaterials,
      cooler,
      coolerBasePosition,
      coolerBaseRotation,
      coolingFadeMaterials,
      coolingParts,
      coolingScreen,
      coolingScreenFadeMaterials,
      coolerHighlightMaterials,
      cpu,
      cpuCenter,
      cpuCloudLocalPosition,
      cpuCloudPosition: new Vector3(
        cpuCenter.x - wholeCenter.x,
        cpuCenter.y - wholeCenter.y,
        cpuBounds.max.z - wholeCenter.z + 0.001,
      ),
      cpuCloudSize,
      cpuFaceLocalPosition,
      cpuFacePosition: new Vector3(
        cpuCenter.x - wholeCenter.x,
        cpuCenter.y - wholeCenter.y,
        cpuBounds.max.z - wholeCenter.z + 0.00012,
      ),
      cpuFaceSize: [cpuSize.x, cpuSize.y] as const,
      cpuFadeMaterials,
      cpuMeshLocalPosition,
      earlyCaseFadeMaterials,
      earlyCaseParts,
      emissiveMaterials,
      disposeGpuCableDeformer: gpuCableDeformer.dispose,
      gpuAssembly,
      gpuAssemblyBasePosition,
      gpuAssemblyBaseRotation,
      gpuAssemblyOpenPosition,
      gpuCableTension,
      gpuHighlightMaterials,
      gpuTarget,
      hoseEndFadeMaterials,
      localCpuCenter,
      motherboard,
      motherboardBackdropFadeMaterials,
      motherboardFadeMaterials,
      coolerTarget,
      ramBaseTransforms,
      ramHighlightMaterials,
      ramParts,
      ramTargets,
      recomputeGpuCableNormals: gpuCableDeformer.recomputeNormals,
      updateGpuCableDeformation,
      wholeCenter,
    };
  }, [coolingScreenMaterial, cpu, model, wholeCenter]);

  useEffect(
    () => () => {
      cpuCloudMaterial.dispose();
      cpuFaceMaterial.map?.dispose();
      cpuFaceMaterial.dispose();
      coolingScreenMaterial.map?.dispose();
      coolingScreenMaterial.dispose();
    },
    [coolingScreenMaterial, cpuCloudMaterial, cpuFaceMaterial],
  );

  useEffect(() => {
    return () => {
      const isolatedMaterials = new Set(
        [
          ...setup.ramHighlightMaterials.flat(),
          ...setup.gpuHighlightMaterials,
        ].map((state) => state.material),
      );
      isolatedMaterials.forEach((material) => material.dispose());
      setup.disposeGpuCableDeformer();
    };
  }, [setup]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      introRef.current = 1;
      updateSceneRef.current(lastProgressRef.current);
      return;
    }

    const introObj = { value: 0 };
    const tween = gsap.to(introObj, {
      duration: 2.2,
      ease: "power2.out",
      value: 1,
      onUpdate: () => {
        introRef.current = introObj.value;
        updateSceneRef.current(lastProgressRef.current);
      },
    });

    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    interactionKindRef.current = interaction;
  }, [interaction]);

  useLayoutEffect(() => {
    const mobile = size.width < 760;
    const rigX = mobile ? 0 : 1.5;
    const rigY = mobile ? -0.62 : -0.08;

    rigRef.current?.position.set(rigX, rigY, 0);

    const cpuPosition = setup.cpuCenter
      .clone()
      .sub(setup.wholeCenter)
      .multiplyScalar(MODEL_SCALE)
      .add(new Vector3(rigX, rigY, 0));
    const introPosition = cpuPosition
      .clone()
      .add(new Vector3(0, 0, mobile ? 2.2 : 1.9));
    const approachPosition = cpuPosition
      .clone()
      .add(new Vector3(0, 0, mobile ? 1.5 : 1.28));
    const introTarget = cpuPosition.clone();
    const approachTarget = cpuPosition.clone();
    const motherboardCurvePosition = cpuPosition
      .clone()
      .add(
        new Vector3(
          mobile ? 0.65 : 1.75,
          mobile ? 0.58 : 0.9,
          mobile ? 3.5 : 4,
        ),
      );
    const motherboardCameraPosition = cpuPosition
      .clone()
      .add(
        new Vector3(
          mobile ? 0.45 : 1.25,
          mobile ? 0.7 : 1.2,
          mobile ? 7.2 : 7.5,
        ),
      );
    const motherboardTarget = cpuPosition.clone();
    const fullPosition = new Vector3(rigX, rigY, mobile ? 15.5 : 9.6);
    const fullTarget = new Vector3(rigX, rigY, 0);
    finalCameraStateRef.current.position.copy(fullPosition);
    finalCameraStateRef.current.target.copy(fullTarget);
    finalCameraStateRef.current.topDistance = mobile ? 5.2 : 4.2;
    finalCameraStateRef.current.viewOffset = mobile ? 0 : -size.width * 0.105;
    const coolerLift = new Vector3(0, 0, 0.115);
    const cameraHoldCurveAmount = range(0.29, 0.14, 0.4);
    const cameraHoldPosition = curveVector(
      approachPosition,
      motherboardCurvePosition,
      motherboardCameraPosition,
      cameraHoldCurveAmount,
    );
    const cameraHoldTarget = mixVector(
      approachTarget,
      motherboardTarget,
      cameraHoldCurveAmount,
    );

    const applyProgress = (progress: number) => {
      lastProgressRef.current = progress;
      const effectiveIntro = Math.max(
        introRef.current,
        Math.min(1, progress * 10),
      );

      const approach = range(progress, 0, 0.14);
      const motherboardReveal = range(progress, 0.14, 0.29);
      const caseReveal = range(progress, 0.43, 0.82);
      const sceneReveal = range(progress, 0.1, 0.28);
      const fogRelease = range(progress, 0.08, 0.22);
      const seated = smoothstep(range(progress, 0.25, 0.43));
      const motherboardBackdropOpacity = smoothstep(
        range(progress, 0.07, 0.11),
      );
      const motherboardOpacity = smoothstep(range(progress, 0.1, 0.17));
      const chassisOpacity = smoothstep(range(progress, 0.1, 0.17));
      const earlyCaseOpacity = smoothstep(range(progress, 0.09, 0.17));
      const caseOpacity = smoothstep(range(progress, 0.14, 0.24));
      const coolingOpacity = smoothstep(range(progress, 0.235, 0.28));
      const coolingScreenOpacity = smoothstep(range(progress, 0.235, 0.33));
      const hoseEndOpacity = smoothstep(range(progress, 0.29, 0.31));

      setup.motherboard.visible =
        Math.max(motherboardBackdropOpacity, motherboardOpacity) > 0.001;
      setup.chassis.visible = chassisOpacity > 0.001;
      setup.earlyCaseParts.forEach((part) => {
        part.visible = earlyCaseOpacity > 0.001;
      });
      setup.caseParts.forEach((part) => {
        part.visible = caseOpacity > 0.001;
      });
      setup.coolingParts.forEach((part) => {
        part.visible = coolingOpacity > 0.001;
      });
      setup.cpu.traverse((part) => {
        part.visible = effectiveIntro > 0.001;
      });

      applyMaterialFade(setup.cpuFadeMaterials, effectiveIntro);
      cpuFaceMaterial.opacity = effectiveIntro;
      cpuFaceMaterial.depthWrite = effectiveIntro > 0.98;

      applyMaterialFade(setup.motherboardFadeMaterials, motherboardOpacity);
      applyMaterialFade(
        setup.motherboardBackdropFadeMaterials,
        motherboardBackdropOpacity,
      );
      applyMaterialFade(setup.chassisFadeMaterials, chassisOpacity, false);
      applyMaterialFade(setup.earlyCaseFadeMaterials, earlyCaseOpacity);
      applyMaterialFade(setup.caseFadeMaterials, caseOpacity);
      applyMaterialFade(setup.coolingFadeMaterials, coolingOpacity);
      applyMaterialFade(setup.coolingScreenFadeMaterials, coolingScreenOpacity);
      applyMaterialFade(setup.hoseEndFadeMaterials, hoseEndOpacity);

      const baseCameraPosition =
        progress < 0.14
          ? mixVector(introPosition, approachPosition, approach)
          : progress < 0.29
            ? curveVector(
                approachPosition,
                motherboardCurvePosition,
                motherboardCameraPosition,
                motherboardReveal * cameraHoldCurveAmount,
              )
            : progress < 0.43
              ? cameraHoldPosition.clone()
              : mixVector(cameraHoldPosition, fullPosition, caseReveal);
      const cameraTarget =
        progress < 0.14
          ? mixVector(introTarget, approachTarget, approach)
          : progress < 0.29
            ? mixVector(approachTarget, motherboardTarget, motherboardReveal)
            : progress < 0.43
              ? cameraHoldTarget.clone()
              : mixVector(cameraHoldTarget, fullTarget, caseReveal);

      const cameraPosition = baseCameraPosition.clone();
      if (progress < 0.14) {
        cameraPosition.z += (1 - effectiveIntro) * (mobile ? 0.4 : 0.3);
      }

      const interactionOwnsCamera =
        Boolean(interactionKindRef.current) && progress >= 0.995;

      if (!interactionOwnsCamera) {
        camera.position.copy(cameraPosition);
        camera.up.set(0, 1, 0);
        camera.lookAt(cameraTarget);

        if (camera instanceof PerspectiveCamera) {
          const viewOffset = mobile
            ? 0
            : -size.width *
              (0.23 * (1 - motherboardReveal) +
                0.08 * motherboardReveal * (1 - caseReveal) +
                0.105 * caseReveal);

          if (Math.abs(viewOffset) > 0.5) {
            camera.setViewOffset(
              size.width,
              size.height,
              viewOffset,
              0,
              size.width,
              size.height,
            );
          } else {
            camera.clearViewOffset();
          }
          camera.updateProjectionMatrix();
        }

        camera.updateMatrixWorld();
      }
      cpuCloudMaterial.uniforms.uIntro.value = effectiveIntro;
      cpuCloudMaterial.uniforms.uProgress.value = range(progress, 0, 0.18);

      if (cpuGroupRef.current) {
        const cpuScale = 0.94 + 0.06 * effectiveIntro;
        cpuGroupRef.current.scale.set(cpuScale, cpuScale, cpuScale);
        cpuGroupRef.current.position.set(
          setup.localCpuCenter.x,
          setup.localCpuCenter.y,
          setup.localCpuCenter.z - 0.012 * (1 - effectiveIntro),
        );
      }

      const activeLift = coolerLift.clone().multiplyScalar(1 - seated);
      setup.cooler.position.copy(setup.coolerBasePosition).add(activeLift);
      setup.cooler.rotation.copy(setup.coolerBaseRotation);
      setup.cooler.updateMatrixWorld(true);
      setup.cable.position.copy(setup.cableBasePosition).add(activeLift);
      setup.cable.rotation.copy(setup.cableBaseRotation);
      setup.cable.updateMatrixWorld(true);

      setup.emissiveMaterials.forEach((material) => {
        material.emissiveIntensity =
          (material.userData.originalEmissiveIntensity ?? 1) * sceneReveal;
      });

      if (cpuLightRef.current) {
        cpuLightRef.current.position.set(
          cpuPosition.x - 0.15,
          cpuPosition.y + 0.18,
          cpuPosition.z + 0.42,
        );
        cpuLightRef.current.intensity =
          (2.2 - sceneReveal * 0.7) * Math.pow(effectiveIntro, 1.4);
      }
      if (fillLightRef.current) {
        fillLightRef.current.intensity =
          (0.2 + sceneReveal * 7.5) * (0.25 + 0.75 * effectiveIntro);
      }
      if (ambientLightRef.current) {
        ambientLightRef.current.intensity =
          (0.025 + sceneReveal * 0.7) * (0.35 + 0.65 * effectiveIntro);
      }
      if (directionalLightRef.current) {
        directionalLightRef.current.intensity = sceneReveal * 2.1;
      }
      if (fogRef.current) {
        fogRef.current.near = 0.8 + fogRelease * 1.6;
        fogRef.current.far = 2.8 + fogRelease * 30;
      }

      invalidate();
    };

    updateSceneRef.current = applyProgress;
    applyProgress(progressSource.get());

    return progressSource.subscribe(applyProgress);
  }, [
    camera,
    cpuCloudMaterial,
    cpuFaceMaterial,
    invalidate,
    progressSource,
    setup,
    size.height,
    size.width,
  ]);

  useEffect(() => {
    if (!interactionReady || interactionIntroPlayedRef.current) return;

    interactionIntroPlayedRef.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ramMaterials = setup.ramHighlightMaterials.flat();
    const sequence = [
      ramMaterials,
      setup.coolerHighlightMaterials,
      setup.gpuHighlightMaterials,
    ];
    const timeline = gsap.timeline({
      delay: 0.18,
      onComplete: () => {
        introHighlightTimelineRef.current = null;
      },
    });

    sequence.forEach((states, index) => {
      const position = index * 0.42;
      addHighlightTween(timeline, states, 0.14, position, 0.2);
      addHighlightRestore(timeline, states, position + 0.2, 0.22);
    });

    introHighlightTimelineRef.current = timeline;
    return () => {
      timeline.kill();
      sequence.flat().forEach((state) => {
        state.material.emissive.copy(state.color);
        state.material.emissiveIntensity = state.intensity;
      });
    };
  }, [interactionReady, setup]);

  useEffect(() => {
    hoverHighlightTimelineRef.current?.kill();

    const allMaterials = [
      ...setup.ramHighlightMaterials.flat(),
      ...setup.coolerHighlightMaterials,
      ...setup.gpuHighlightMaterials,
    ];
    const targetMaterials =
      hoveredTarget?.kind === "ram"
        ? setup.ramHighlightMaterials[hoveredTarget.ramIndex]
        : hoveredTarget?.kind === "cooler"
          ? setup.coolerHighlightMaterials
          : hoveredTarget?.kind === "gpu"
            ? setup.gpuHighlightMaterials
            : null;

    if (
      !interactionReady ||
      interaction ||
      !targetMaterials ||
      !hoveredTarget
    ) {
      if (introHighlightTimelineRef.current?.isActive()) return;
      const resetTimeline = gsap.timeline();
      addHighlightRestore(resetTimeline, allMaterials, 0, 0.28);
      hoverHighlightTimelineRef.current = resetTimeline;
      return () => {
        resetTimeline.kill();
      };
    }

    introHighlightTimelineRef.current?.kill();
    introHighlightTimelineRef.current = null;
    const timeline = gsap.timeline();
    addHighlightRestore(timeline, allMaterials, 0, 0.24);
    addHighlightTween(timeline, targetMaterials, 0.2, 0, 0.34);
    hoverHighlightTimelineRef.current = timeline;

    return () => {
      timeline.kill();
    };
  }, [hoveredTarget, interaction, interactionReady, setup]);

  useEffect(() => {
    interactionTimelineRef.current?.kill();

    const canInteract = interactionReady && lastProgressRef.current >= 0.995;
    const selectedRamIndex =
      canInteract && interaction?.kind === "ram" ? interaction.ramIndex : -1;
    const gpuSelected = canInteract && interaction?.kind === "gpu";
    const coolerSelected = canInteract && interaction?.kind === "cooler";
    const timeline = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        setup.updateGpuCableDeformation();
        setup.recomputeGpuCableNormals();
      },
      onUpdate: setup.updateGpuCableDeformation,
    });

    setup.ramParts.forEach((part, index) => {
      const base = setup.ramBaseTransforms[index];
      const selected = index === selectedRamIndex;
      timeline.to(
        part.position,
        {
          duration: selected ? 0.62 : 0.48,
          x: base.position.x,
          y: base.position.y,
          z: base.position.z + (selected ? 0.11 : 0),
        },
        0,
      );
      timeline.to(
        part.rotation,
        {
          duration: selected ? 0.72 : 0.48,
          x: base.rotation.x,
          y: base.rotation.y + (selected ? Math.PI / 2 : 0),
          z: base.rotation.z,
        },
        selected ? 0.18 : 0,
      );
    });

    timeline.to(
      setup.gpuAssembly.position,
      {
        duration: gpuSelected ? 1.55 : 0.9,
        x: gpuSelected
          ? setup.gpuAssemblyOpenPosition.x
          : setup.gpuAssemblyBasePosition.x,
        y: gpuSelected
          ? setup.gpuAssemblyOpenPosition.y
          : setup.gpuAssemblyBasePosition.y,
        z: gpuSelected
          ? setup.gpuAssemblyOpenPosition.z
          : setup.gpuAssemblyBasePosition.z,
      },
      gpuSelected ? 0.12 : 0.28,
    );
    timeline.to(
      setup.gpuAssembly.rotation,
      {
        duration: gpuSelected ? 1.55 : 0.9,
        x: setup.gpuAssemblyBaseRotation.x + (gpuSelected ? Math.PI : 0),
        y: setup.gpuAssemblyBaseRotation.y,
        z: setup.gpuAssemblyBaseRotation.z,
      },
      gpuSelected ? 0.12 : 0.28,
    );
    timeline.to(
      setup.gpuCableTension,
      {
        duration: gpuSelected ? 1.55 : 0.9,
        value: gpuSelected ? 1 : 0,
      },
      gpuSelected ? 0.12 : 0.28,
    );
    const applyInteractionViewOffset = () => {
      if (!(camera instanceof PerspectiveCamera)) return;
      const viewOffset = finalCameraStateRef.current.viewOffset;

      if (Math.abs(viewOffset) > 0.5) {
        camera.setViewOffset(
          size.width,
          size.height,
          viewOffset,
          0,
          size.width,
          size.height,
        );
      } else {
        camera.clearViewOffset();
      }
      camera.updateProjectionMatrix();
    };

    const updateGpuCamera = () => {
      const amount = smoothstep(gpuCameraAmountRef.current.value);
      const finalState = finalCameraStateRef.current;
      setup.gpuAssembly.updateWorldMatrix(true, true);
      const gpuWorldTarget = setup.gpuAssembly.getWorldPosition(new Vector3());
      const gpuCameraPosition = gpuWorldTarget
        .clone()
        .add(new Vector3(0, finalState.topDistance, 0.001));
      const cameraTarget = finalState.target
        .clone()
        .lerp(gpuWorldTarget, amount);

      camera.position.copy(finalState.position).lerp(gpuCameraPosition, amount);
      camera.up
        .set(0, 1, 0)
        .lerp(new Vector3(0, 0, -1), amount)
        .normalize();
      camera.lookAt(cameraTarget);

      applyInteractionViewOffset();

      camera.updateMatrixWorld();
      invalidate();
    };

    const updateCoolerCamera = () => {
      const amount = smoothstep(coolerCameraAmountRef.current.value);
      const finalState = finalCameraStateRef.current;
      setup.coolingScreen.updateWorldMatrix(true, false);
      const coolerWorldTarget = setup.coolingScreen.getWorldPosition(
        new Vector3(),
      );
      const coolerCameraPosition = coolerWorldTarget
        .clone()
        .add(new Vector3(0, 0, size.width < 760 ? 1.75 : 1.35));

      camera.position
        .copy(finalState.position)
        .lerp(coolerCameraPosition, amount);
      camera.up.set(0, 1, 0);
      camera.lookAt(finalState.target.clone().lerp(coolerWorldTarget, amount));

      applyInteractionViewOffset();

      camera.updateMatrixWorld();
      invalidate();
    };

    const gpuCameraActive =
      gpuSelected || gpuCameraAmountRef.current.value > 0.001;
    if (gpuCameraActive) {
      timeline.to(
        gpuCameraAmountRef.current,
        {
          duration: gpuSelected ? 1.65 : 1.05,
          onComplete: () => {
            if (!gpuSelected) {
              camera.up.set(0, 1, 0);
              updateSceneRef.current(lastProgressRef.current);
            }
          },
          onUpdate: updateGpuCamera,
          value: gpuSelected ? 1 : 0,
        },
        gpuSelected ? 1.82 : 0,
      );
    }

    const coolerCameraActive =
      coolerSelected || coolerCameraAmountRef.current.value > 0.001;
    if (coolerCameraActive) {
      timeline.to(
        coolerCameraAmountRef.current,
        {
          duration: coolerSelected ? 1.55 : 1,
          onComplete: () => {
            if (!coolerSelected) {
              camera.up.set(0, 1, 0);
              updateSceneRef.current(lastProgressRef.current);
            }
          },
          onUpdate: updateCoolerCamera,
          value: coolerSelected ? 1 : 0,
        },
        coolerSelected ? 0.06 : 0,
      );
    }

    interactionTimelineRef.current = timeline;
    return () => {
      timeline.kill();
    };
  }, [
    camera,
    interaction,
    interactionReady,
    invalidate,
    setup,
    size.height,
    size.width,
  ]);

  return (
    <>
      <fog ref={fogRef} attach="fog" args={["#020304", 0.8, 2.8]} />
      <ambientLight ref={ambientLightRef} color="#b7dce5" intensity={0.025} />
      <pointLight
        ref={cpuLightRef}
        color="#d8e2e5"
        intensity={2.2}
        distance={3.2}
        decay={2}
      />
      <pointLight
        ref={fillLightRef}
        position={[4.4, 3.2, 4.8]}
        color="#b5dce5"
        intensity={0.2}
        distance={16}
        decay={2}
      />
      <directionalLight
        ref={directionalLightRef}
        position={[-4, 5, 5]}
        color="#74bfd0"
        intensity={0}
      />
      <group ref={rigRef} scale={MODEL_SCALE}>
        <primitive object={model} />
        {setup.ramTargets.map((target, ramIndex) => (
          <InteractionHitbox
            enabled={interactionReady && !interaction}
            key={`ram-hitbox-${ramIndex}`}
            onActivate={(anchor) => onRamClick(ramIndex, anchor)}
            onHoverChange={onHoverChange}
            position={target.position}
            size={target.size}
            target={{ kind: "ram", ramIndex }}
          />
        ))}
        <InteractionHitbox
          enabled={interactionReady && !interaction}
          onActivate={onCoolerClick}
          onHoverChange={onHoverChange}
          position={setup.coolerTarget.position}
          size={setup.coolerTarget.size}
          target={{ kind: "cooler" }}
        />
        <InteractionHitbox
          enabled={interactionReady && !interaction}
          onActivate={onGpuClick}
          onHoverChange={onHoverChange}
          position={setup.gpuTarget.position}
          size={setup.gpuTarget.size}
          target={{ kind: "gpu" }}
        />
        <group ref={cpuGroupRef} position={setup.localCpuCenter}>
          <group position={setup.cpuMeshLocalPosition}>
            <primitive object={setup.cpu} />
          </group>
          <mesh
            position={setup.cpuFaceLocalPosition}
            renderOrder={4}
            scale={[cpuFaceWidthScale, cpuFaceHeightScale, 1]}
          >
            <planeGeometry args={setup.cpuFaceSize} />
            <primitive object={cpuFaceMaterial} attach="material" />
          </mesh>
          <mesh position={setup.cpuCloudLocalPosition} renderOrder={5}>
            <planeGeometry args={[setup.cpuCloudSize, setup.cpuCloudSize]} />
            <primitive object={cpuCloudMaterial} attach="material" />
          </mesh>
        </group>
      </group>
    </>
  );
}

useGLTF.preload(MODEL_URL);
