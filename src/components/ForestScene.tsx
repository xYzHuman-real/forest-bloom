import { Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Billboard, Cloud, Clouds } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { SPECIES_BY_KEY } from "@/lib/treerise/species";
import type { TreeState } from "@/lib/treerise/logic";

interface TreeData {
  id: string; species: string; state: TreeState;
  position_x: number; position_z: number; growth_pct: number;
}

function Island() {
  // Stylized floating island: green disc with rocky underside
  return (
    <group>
      {/* grass top */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[7, 7, 0.35, 64]} />
        <meshStandardMaterial color="#9bd47b" roughness={0.95} />
      </mesh>
      {/* slight rim shadow */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[7.05, 6.8, 0.05, 64]} />
        <meshStandardMaterial color="#74b35a" roughness={1} />
      </mesh>
      {/* rocky underside */}
      <mesh position={[0, -1.4, 0]}>
        <coneGeometry args={[6.6, 2.6, 6]} />
        <meshStandardMaterial color="#6a5b48" roughness={1} />
      </mesh>
      <mesh position={[0, -2.3, 0]}>
        <coneGeometry args={[3.6, 2.4, 5]} />
        <meshStandardMaterial color="#52473a" roughness={1} />
      </mesh>
      {/* pond */}
      <mesh position={[-3.2, 0.19, 2.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial color="#79c3e0" emissive="#3c8aa8" emissiveIntensity={0.15} />
      </mesh>
      {/* path stones */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos(i * 0.6) * (i + 0.5), 0.2, Math.sin(i * 0.6) * (i + 0.5)]}>
          <cylinderGeometry args={[0.18, 0.2, 0.05, 12]} />
          <meshStandardMaterial color="#cfcab6" />
        </mesh>
      ))}
      {/* small bridge */}
      <mesh position={[-3.2, 0.3, 1.0]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[1.4, 0.1, 0.4]} />
        <meshStandardMaterial color="#8a5a36" />
      </mesh>
    </group>
  );
}

function TreeSprite({ tree, onClick }: { tree: TreeData; onClick: () => void }) {
  const meta = SPECIES_BY_KEY[tree.species] ?? SPECIES_BY_KEY["neem"];
  const ref = useRef<THREE.Group>(null);
  // gentle sway
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + tree.position_x * 1.7;
    ref.current.rotation.z = Math.sin(t * 0.8) * 0.03;
  });

  const dead = tree.state === "dead";
  const scale = dead ? 0.7 : tree.state === "dying" ? 0.85 : tree.state === "weak" ? 0.95 : 1;
  const canopy = dead ? "#7a6a55" : meta.hue;
  const trunk = dead ? "#3e2f23" : "#6b4a2b";

  return (
    <group position={[tree.position_x, 0.18, tree.position_z]} scale={scale} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* trunk */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.8, 8]} />
        <meshStandardMaterial color={trunk} />
      </mesh>
      {dead ? (
        <>
          <mesh position={[0.18, 0.7, 0]} rotation={[0, 0, -0.6]}><cylinderGeometry args={[0.03, 0.05, 0.6, 6]} /><meshStandardMaterial color={trunk} /></mesh>
          <mesh position={[-0.2, 0.75, 0.05]} rotation={[0, 0, 0.7]}><cylinderGeometry args={[0.03, 0.05, 0.5, 6]} /><meshStandardMaterial color={trunk} /></mesh>
        </>
      ) : (
        <group ref={ref}>
          <mesh position={[0, 1.05, 0]} castShadow>
            <sphereGeometry args={[0.55, 16, 12]} />
            <meshStandardMaterial color={canopy} roughness={0.9} />
          </mesh>
          <mesh position={[0.32, 0.85, 0.1]}>
            <sphereGeometry args={[0.32, 12, 10]} />
            <meshStandardMaterial color={canopy} roughness={0.95} />
          </mesh>
          <mesh position={[-0.28, 0.9, -0.1]}>
            <sphereGeometry args={[0.3, 12, 10]} />
            <meshStandardMaterial color={canopy} roughness={0.95} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Butterflies({ count = 6 }: { count?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 8, h: 1 + Math.random() * 1.5, p: i })), [count]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const s = seeds[i];
      m.position.x = s.x + Math.sin(t * 0.6 + s.p) * 1.2;
      m.position.z = s.z + Math.cos(t * 0.5 + s.p) * 1.2;
      m.position.y = s.h + Math.sin(t * 2 + s.p) * 0.15;
    });
  });
  return (
    <>
      {seeds.map((_, i) => (
        <Billboard key={i}>
          <mesh ref={(el) => { refs.current[i] = el; }}>
            <planeGeometry args={[0.18, 0.18]} />
            <meshBasicMaterial color={i % 2 ? "#f4a3c5" : "#ffd166"} transparent opacity={0.9} />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}

function Birds({ count = 3 }: { count?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ r: 4 + Math.random() * 2, h: 3 + Math.random(), p: i })), [count]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const s = seeds[i];
      m.position.x = Math.cos(t * 0.3 + s.p) * s.r;
      m.position.z = Math.sin(t * 0.3 + s.p) * s.r;
      m.position.y = s.h;
    });
  });
  return (
    <>
      {seeds.map((_, i) => (
        <Billboard key={i}>
          <mesh ref={(el) => { refs.current[i] = el; }}>
            <planeGeometry args={[0.25, 0.12]} />
            <meshBasicMaterial color="#333" transparent opacity={0.85} />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}

export function ForestScene({ trees, onTreeSelect }: { trees: TreeData[]; onTreeSelect: (t: TreeData) => void }) {
  const healthyCount = trees.filter((t) => t.state === "healthy" || t.state === "reviving").length;
  const showBirds = healthyCount >= 10;
  const showButterflies = healthyCount >= 20;
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 6, 10], fov: 45 }}
      style={{ background: "linear-gradient(180deg, #d9efff 0%, #eaf7e3 65%, #c8e6b1 100%)" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 4]} intensity={1.1} castShadow />
      <Suspense fallback={null}>
        <Island />
        {trees.map((t) => <TreeSprite key={t.id} tree={t} onClick={() => onTreeSelect(t)} />)}
        {showButterflies && <Butterflies count={8} />}
        {showBirds && <Birds count={4} />}
        <Clouds material={THREE.MeshBasicMaterial}>
          <Cloud seed={1} bounds={[8, 1, 8]} volume={4} color="white" position={[3, 5, -3]} />
          <Cloud seed={2} bounds={[8, 1, 8]} volume={4} color="white" position={[-4, 5.5, 2]} />
        </Clouds>
      </Suspense>
      <OrbitControls
        enablePan
        minDistance={5}
        maxDistance={16}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        target={[0, 0.5, 0]}
      />
    </Canvas>
  );
}
