export function SceneEnvironment() {
  return (
    <>
      <hemisphereLight args={["#c7e8f5", "#080a0c", 0.8]} />
      <directionalLight position={[3, 4, 5]} color="#d9f2ff" intensity={3.2} />
      <directionalLight position={[-4, 1, -2]} color="#8b94c9" intensity={1.1} />
      <directionalLight position={[5, -1, -3]} color="#a6dcea" intensity={2.4} />
    </>
  );
}
