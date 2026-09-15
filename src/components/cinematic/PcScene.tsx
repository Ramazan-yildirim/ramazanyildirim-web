"use client";

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AmbientLight,
  Box3,
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
  Vector3,
} from "three";
import { range, type ProgressSource } from "./scroll-progress";

const MODEL_URL = "/models/portfolio_scene.glb";
const MODEL_SCALE = 12;

type PcSceneProps = {
  progressSource: ProgressSource;
};

type EmissiveMaterial = MeshStandardMaterial & {
  userData: { originalEmissiveIntensity?: number };
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
    float innerEdge = smoothstep(0.24 + uProgress * 0.28, 0.47 + uProgress * 0.3, distanceFromCpu);
    float outerEdge = 1.0 - smoothstep(0.82, 1.38, distanceFromCpu);
    float wisps = smoothstep(0.37, 0.78, turbulence + distanceFromCpu * 0.12);
    float dissolve = 1.0 - smoothstep(0.0, 1.0, uProgress);
    float alpha = innerEdge * outerEdge * wisps * dissolve * 0.92;
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

function getCenter(object: Object3D) {
  return new Box3().setFromObject(object).getCenter(new Vector3());
}

function hasEmissiveIntensity(material: Material): material is EmissiveMaterial {
  return "emissiveIntensity" in material;
}

function createCpuCloudMaterial() {
  return new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: CPU_CLOUD_FRAGMENT_SHADER,
    side: DoubleSide,
    transparent: true,
    uniforms: { uProgress: { value: 0 } },
    vertexShader: CPU_CLOUD_VERTEX_SHADER,
  });
}

export function PcScene({ progressSource }: PcSceneProps) {
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
  const rigRef = useRef<Group>(null);
  const ambientLightRef = useRef<AmbientLight>(null);
  const cpuLightRef = useRef<PointLight>(null);
  const directionalLightRef = useRef<DirectionalLight>(null);
  const fillLightRef = useRef<PointLight>(null);
  const fogRef = useRef<Fog>(null);
  const { camera, invalidate, size } = useThree();

  const setup = useMemo(() => {
    model.updateMatrixWorld(true);

    const motherboard = model.getObjectByName("ANAKART");
    const cooler = model.getObjectByName("SIVI_SOGUTMA_EKRAN");
    const radiator = model.getObjectByName("SIVI_SOGUTMA_FAN_KASA");
    const cable = model.getObjectByName("SIVI_SOGUTMA_KABLO");

    if (!motherboard || !cooler || !radiator || !cable) {
      throw new Error("Required PC model parts could not be found.");
    }

    const cpuCenter = getCenter(cpu);
    const cpuBounds = new Box3().setFromObject(cpu);
    const cpuSize = cpuBounds.getSize(new Vector3());
    const coolerBasePosition = cooler.position.clone();
    const coolerBaseRotation = cooler.rotation.clone();
    const cableBasePosition = cable.position.clone();
    const cableBaseRotation = cable.rotation.clone();
    const rootParts = [...model.children];
    const coolingParts = new Set(
      rootParts.filter((part) => part.name.startsWith("SIVI_SOGUTMA_")),
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
          cpuMaterials.add(material);
          return material;
        }

        const displayMaterial = new MeshBasicMaterial({
          color: "#aeb4b6",
          map: material.map,
          side: DoubleSide,
          toneMapped: true,
        });
        displayMaterial.name = `${material.name}-cpu-display`;
        cpuMaterials.add(displayMaterial);
        return displayMaterial;
      });

      object.material = Array.isArray(object.material)
        ? displayMaterials
        : displayMaterials[0];
    });

    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        if (cpuMaterials.has(material) || !hasEmissiveIntensity(material)) return;
        material.userData.originalEmissiveIntensity = material.emissiveIntensity;
        emissiveMaterials.push(material);
      });
    });

    model.position.copy(wholeCenter).multiplyScalar(-1);

    return {
      cable,
      cableBasePosition,
      cableBaseRotation,
      cooler,
      coolerBasePosition,
      coolerBaseRotation,
      coolingParts,
      cpu,
      cpuCenter,
      cpuCloudPosition: new Vector3(
        cpuCenter.x - wholeCenter.x,
        cpuCenter.y - wholeCenter.y,
        cpuBounds.max.z - wholeCenter.z + 0.001,
      ),
      cpuCloudSize,
      emissiveMaterials,
      motherboard,
      rootParts,
      wholeCenter,
    };
  }, [cpu, model, wholeCenter]);

  useEffect(() => () => cpuCloudMaterial.dispose(), [cpuCloudMaterial]);

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
      .add(new Vector3(0, 0, mobile ? 1.9 : 1.55));
    const approachPosition = cpuPosition
      .clone()
      .add(new Vector3(0, 0, mobile ? 0.9 : 0.68));
    const introTarget = cpuPosition.clone();
    const approachTarget = cpuPosition.clone();
    const motherboardCurvePosition = cpuPosition
      .clone()
      .add(
        new Vector3(
          mobile ? -1.05 : -1.8,
          mobile ? 0.58 : 1,
          mobile ? 1.65 : 1.3,
        ),
      );
    const motherboardCameraPosition = cpuPosition
      .clone()
      .add(
        new Vector3(
          mobile ? -1.25 : -2.25,
          mobile ? 0.7 : 1.2,
          mobile ? 6.4 : 6.2,
        ),
      );
    const motherboardTarget = cpuPosition.clone();
    const fullPosition = new Vector3(
      rigX,
      rigY,
      mobile ? 15.5 : 9.6,
    );
    const fullTarget = new Vector3(rigX, rigY, 0);
    const coolerLift = new Vector3(0, 0, 0.115);
    let visibleStage: "cpu" | "motherboard" | "case" | null = null;
    let coolingVisible: boolean | null = null;

    const applyProgress = (progress: number) => {
      const approach = range(progress, 0, 0.18);
      const motherboardReveal = range(progress, 0.18, 0.4);
      const caseReveal = range(progress, 0.4, 0.82);
      const sceneReveal = range(progress, 0.14, 0.42);
      const seated = smoothstep(range(progress, 0.25, 0.72));
      const nextVisibleStage =
        progress < 0.18
          ? "cpu"
        : progress < 0.25
            ? "motherboard"
            : "case";
      const nextCoolingVisible = progress >= 0.25;

      if (
        nextVisibleStage !== visibleStage ||
        nextCoolingVisible !== coolingVisible
      ) {
        setup.rootParts.forEach((part) => {
          const stageVisible =
            nextVisibleStage === "case" ||
            part === setup.cpu ||
            (nextVisibleStage === "motherboard" && part === setup.motherboard);
          part.visible =
            stageVisible &&
            (!setup.coolingParts.has(part) || nextCoolingVisible);
        });
        setup.cpu.traverse((part) => {
          part.visible = true;
        });
        visibleStage = nextVisibleStage;
        coolingVisible = nextCoolingVisible;
      }

      const cameraPosition =
        progress < 0.18
          ? mixVector(introPosition, approachPosition, approach)
          : progress < 0.4
            ? curveVector(
                approachPosition,
                motherboardCurvePosition,
                motherboardCameraPosition,
                motherboardReveal,
              )
            : mixVector(motherboardCameraPosition, fullPosition, caseReveal);
      const cameraTarget =
        progress < 0.18
          ? mixVector(introTarget, approachTarget, approach)
          : progress < 0.4
            ? mixVector(
                approachTarget,
                motherboardTarget,
                motherboardReveal,
              )
            : mixVector(motherboardTarget, fullTarget, caseReveal);

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
      cpuCloudMaterial.uniforms.uProgress.value = range(progress, 0, 0.18);

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
        cpuLightRef.current.intensity = 2.2 - sceneReveal * 0.7;
      }
      if (fillLightRef.current) {
        fillLightRef.current.intensity = 0.2 + sceneReveal * 7.5;
      }
      if (ambientLightRef.current) {
        ambientLightRef.current.intensity = 0.025 + sceneReveal * 0.7;
      }
      if (directionalLightRef.current) {
        directionalLightRef.current.intensity = sceneReveal * 2.1;
      }
      if (fogRef.current) {
        fogRef.current.near = 0.8 + sceneReveal * 1.8;
        fogRef.current.far = 2.8 + sceneReveal * 18.85;
      }

      invalidate();
    };

    return progressSource.subscribe(applyProgress);
  }, [camera, cpuCloudMaterial, invalidate, progressSource, setup, size.height, size.width]);

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
        <group position={model.position}>
          <primitive object={setup.cpu} />
        </group>
        <mesh position={setup.cpuCloudPosition} renderOrder={5}>
          <planeGeometry args={[setup.cpuCloudSize, setup.cpuCloudSize]} />
          <primitive object={cpuCloudMaterial} attach="material" />
        </mesh>
      </group>
    </>
  );
}

useGLTF.preload(MODEL_URL);
