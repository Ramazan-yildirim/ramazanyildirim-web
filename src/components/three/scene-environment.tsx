export function SceneEnvironment() {
  return (
    <>
      <hemisphereLight args={["#c7e8f5", "#080a0c", 0.6]} />
      <directionalLight position={[4, 5, 3]} color="#d9f2ff" intensity={1.5} />
      <directionalLight position={[-4, 1, -2]} color="#8b94c9" intensity={0.4} />
    </>
  );
}
