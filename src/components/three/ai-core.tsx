import { DoubleSide } from "three";

type AICoreProps = {
  compact: boolean;
};

const SEGMENTS = [0, 1, 2] as const;

function CoreShell({ index, compact }: { index: number; compact: boolean }) {
  return (
    <group name={`core-shell-${index + 1}`} rotation={[0, index * Math.PI * 2 / 3, 0]}>
      <mesh>
        <sphereGeometry args={[1, compact ? 20 : 40, compact ? 12 : 24, 0.14, Math.PI * 2 / 3 - 0.28, 0.38, Math.PI - 0.76]} />
        <meshStandardMaterial color="#35444f" metalness={0.72} roughness={0.34} side={DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.035, 0.022, 6, compact ? 20 : 40, Math.PI * 2 / 3 - 0.28]} />
        <meshStandardMaterial color="#84afbd" metalness={0.65} roughness={0.3} emissive="#6aa9bd" emissiveIntensity={0.08} />
      </mesh>
    </group>
  );
}

export function AICore({ compact }: AICoreProps) {
  return (
    <group name="ai-core" rotation={[0.24, -0.42, -0.32]}>
      <group name="core-shells">
        {SEGMENTS.map((index) => <CoreShell key={index} index={index} compact={compact} />)}
      </group>
      <mesh name="core-energy" rotation={[0.3, 0.2, 0.1]}>
        <icosahedronGeometry args={[0.67, 1]} />
        <meshStandardMaterial color="#244c60" metalness={0.25} roughness={0.45} emissive="#70d7ef" emissiveIntensity={0.22} flatShading />
      </mesh>
      <mesh name="core-collar" rotation={[Math.PI / 2, 0, 0]} position={[0, 0.94, 0]}>
        <torusGeometry args={[0.39, 0.036, 8, compact ? 24 : 48]} />
        <meshStandardMaterial color="#66818e" metalness={0.7} roughness={0.32} />
      </mesh>
      {!compact && (
        <mesh name="core-orbit" rotation={[1.08, 0.16, 0.3]}>
          <torusGeometry args={[1.24, 0.012, 6, 96, Math.PI * 1.68]} />
          <meshStandardMaterial color="#7c9fac" metalness={0.5} roughness={0.4} />
        </mesh>
      )}
    </group>
  );
}
