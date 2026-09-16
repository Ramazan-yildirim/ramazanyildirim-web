"use client";

/* eslint-disable react-hooks/immutability */

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AmbientLight,
  Box3,
  CanvasTexture,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { range, type ProgressSource } from "./scroll-progress";

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
  progressSource: ProgressSource;
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
      vertex
        .fromBufferAttribute(position, sourceIndex.getX(offset + corner));
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
    } else if (!(motherboardSurfaceSourceMaterial instanceof MeshBasicMaterial)) {
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
    const rootParts = [...model.children];
    const chassis = model.getObjectByName("ANAKASA");

    if (!chassis) {
      throw new Error("Case chassis model part could not be found.");
    }

    const coolingParts = new Set(
      rootParts.filter((part) => part.name.startsWith("SIVI_SOGUTMA_")),
    );
    coolingParts.forEach((part) => {
      const renderOrder = part === cooler ? 7 : part === cable ? 6 : 5;
      part.traverse((object) => {
        if (object instanceof Mesh) object.renderOrder = renderOrder;
      });
    });
    const allCaseParts = rootParts.filter(
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
    const motherboardFadeMaterials = collectFadeMaterials([
      motherboard,
    ]).filter(
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
    const coolingFadeMaterials = collectFadeMaterials([
      ...coolingParts,
    ]).filter(
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
      coolingScreenFadeMaterials,
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
      hoseEndFadeMaterials,
      localCpuCenter,
      motherboard,
      motherboardBackdropFadeMaterials,
      motherboardFadeMaterials,
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
      applyMaterialFade(
        setup.coolingScreenFadeMaterials,
        coolingScreenOpacity,
      );
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

      camera.position.copy(cameraPosition);
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

