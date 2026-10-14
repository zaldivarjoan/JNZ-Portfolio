import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Preload, useGLTF } from "@react-three/drei";
import CanvasLoader from "../Loader";

const ACCENT = new THREE.Color("#915EFF");
const PRESS_DEPTH = 0.009; // how far a key travels, in the key mesh's local units
const PRESS_DOWN = 0.05; // seconds to bottom out
const PRESS_HOLD = 0.08; // seconds held at the bottom
const PRESS_UP = 0.3; // seconds to spring back
const CLICK_TOLERANCE = 6; // px of pointer travel before a click counts as a drag

// The keycaps are a single mesh, but each keycap is its own connected piece of
// geometry. Group vertices into those pieces so every key can move on its own.
const buildKeyIslands = (geometry) => {
  const pos = geometry.attributes.position;
  const index = geometry.index;

  // Weld vertices that share a position (the mesh splits them for UVs/normals)
  const welded = new Int32Array(pos.count);
  const seen = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
    if (!seen.has(key)) seen.set(key, seen.size);
    welded[i] = seen.get(key);
  }

  const parent = Array.from({ length: seen.size }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const triCount = index ? index.count : pos.count;
  for (let t = 0; t < triCount; t += 3) {
    const a = find(welded[index ? index.getX(t) : t]);
    const b = find(welded[index ? index.getX(t + 1) : t + 1]);
    const c = find(welded[index ? index.getX(t + 2) : t + 2]);
    parent[b] = a;
    parent[find(c)] = a;
  }

  const rootToIsland = new Map();
  const vertexIsland = new Int32Array(pos.count);
  const islands = [];
  for (let i = 0; i < pos.count; i++) {
    const root = find(welded[i]);
    if (!rootToIsland.has(root)) {
      rootToIsland.set(root, islands.length);
      islands.push({ vertices: [], center: new THREE.Vector3() });
    }
    const id = rootToIsland.get(root);
    vertexIsland[i] = id;
    islands[id].vertices.push(i);
    islands[id].center.x += pos.getX(i);
    islands[id].center.y += pos.getY(i);
    islands[id].center.z += pos.getZ(i);
  }
  islands.forEach((island) => island.center.divideScalar(island.vertices.length));

  return { vertexIsland, islands, basePositions: pos.array.slice() };
};

const KeyboardModel = ({ isMobile }) => {
  const { scene } = useGLTF("./custom_keyboard/scene.gltf");

  // Work on a private copy so the cached GLTF stays untouched
  const { model, keysMesh, keyData } = useMemo(() => {
    const model = scene.clone(true);
    let keysMesh;
    model.traverse((child) => {
      if (!child.isMesh) return;
      if (child.name.startsWith("Keys")) keysMesh = child;
    });

    keysMesh.geometry = keysMesh.geometry.clone();
    keysMesh.material = keysMesh.material.clone();
    // Per-vertex highlight amount, blended toward the accent color in the shader
    keysMesh.material.onBeforeCompile = (shader) => {
      shader.uniforms.accent = { value: ACCENT };
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "attribute float glow;\nvarying float vGlow;\nvoid main() {\n\tvGlow = glow;");
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", "uniform vec3 accent;\nvarying float vGlow;\nvoid main() {")
        .replace(
          "#include <dithering_fragment>",
          "#include <dithering_fragment>\n\tgl_FragColor.rgb = mix(gl_FragColor.rgb, accent, vGlow * 0.8);"
        );
    };
    const count = keysMesh.geometry.attributes.position.count;
    keysMesh.geometry.setAttribute(
      "glow",
      new THREE.BufferAttribute(new Float32Array(count), 1)
    );

    // Fit the model to a predictable size and center it
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 8 / size.x;
    model.scale.setScalar(scale);
    model.position.copy(center.multiplyScalar(-scale));

    return { model, keysMesh, keyData: buildKeyIslands(keysMesh.geometry) };
  }, [scene]);

  // Per-key animation state: press start time, or -1 when idle
  const pressStart = useRef(new Float32Array(keyData.islands.length).fill(-1));
  const hovered = useRef(-1);
  const flashLight = useRef();
  const clock = useRef(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    document.body.style.cursor = hovering ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovering]);

  const islandFromEvent = (event) => {
    const face = event.face;
    return face ? keyData.vertexIsland[face.a] : -1;
  };

  const pressKey = (id) => {
    pressStart.current[id] = clock.current;

    const worldPos = keysMesh.localToWorld(keyData.islands[id].center.clone());
    flashLight.current.position.copy(worldPos).add(new THREE.Vector3(0, 0.6, 0.4));
    flashLight.current.userData.start = clock.current;
  };

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    clock.current = now;

    const position = keysMesh.geometry.attributes.position;
    const glowAttr = keysMesh.geometry.attributes.glow;
    let dirty = false;

    keyData.islands.forEach((island, id) => {
      const start = pressStart.current[id];
      let depth = 0;
      if (start >= 0) {
        const t = now - start;
        if (t < PRESS_DOWN) {
          depth = t / PRESS_DOWN;
        } else if (t < PRESS_DOWN + PRESS_HOLD) {
          depth = 1;
        } else if (t < PRESS_DOWN + PRESS_HOLD + PRESS_UP) {
          const u = (t - PRESS_DOWN - PRESS_HOLD) / PRESS_UP;
          depth = 1 - (1 - Math.pow(1 - u, 3)); // ease-out on the way back up
        } else {
          pressStart.current[id] = -1;
        }
      }
      const isHovered = hovered.current === id;
      const glow = Math.max(depth, isHovered ? 0.45 : 0);

      if (depth === 0 && glow === 0 && !island.dirty) return;
      island.dirty = depth > 0 || glow > 0;
      dirty = true;

      for (const v of island.vertices) {
        position.setY(v, keyData.basePositions[v * 3 + 1] - PRESS_DEPTH * depth);
        glowAttr.setX(v, glow);
      }
    });

    if (dirty) {
      position.needsUpdate = true;
      glowAttr.needsUpdate = true;
    }

    const light = flashLight.current;
    if (light && light.userData.start !== undefined) {
      const t = now - light.userData.start;
      light.intensity = Math.max(0, 6 * (1 - t / 0.5));
    }
  });

  return (
    <>
      <pointLight ref={flashLight} color={ACCENT} intensity={0} distance={4} />
      <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.4}>
        <group
          rotation={[0.55, isMobile ? 0 : -0.35, 0]}
          scale={isMobile ? 0.45 : 1}
          position={isMobile ? [0, -1.2, 0] : [0, -1.4, 0]}
        >
          <primitive
            object={model}
            onPointerMove={(e) => {
              if (e.object !== keysMesh) return;
              e.stopPropagation();
              hovered.current = islandFromEvent(e);
              setHovering(true);
            }}
            onPointerOut={() => {
              hovered.current = -1;
              setHovering(false);
            }}
            onClick={(e) => {
              if (e.object !== keysMesh || e.delta > CLICK_TOLERANCE) return;
              e.stopPropagation();
              const id = islandFromEvent(e);
              if (id >= 0) pressKey(id);
            }}
          />
        </group>
      </Float>
    </>
  );
};

const ComputersCanvas = () => {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 500px)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 500px)");

    const handleMediaQueryChange = (event) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener("change", handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 3, 18], fov: 30 }}
      gl={{ preserveDrawingBuffer: true }}
    >
      <Suspense fallback={<CanvasLoader />}>
        <ambientLight intensity={0.6} />
        <hemisphereLight intensity={0.5} groundColor="#1d1836" />
        <directionalLight position={[5, 10, 8]} intensity={1.6} />
        <spotLight
          position={[-8, 6, -6]}
          angle={0.5}
          penumbra={1}
          intensity={2}
          color="#915EFF"
        />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={!isMobile}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 3}
        />
        <KeyboardModel isMobile={isMobile} />
      </Suspense>
      <Preload all />
    </Canvas>
  );
};

export default ComputersCanvas;
