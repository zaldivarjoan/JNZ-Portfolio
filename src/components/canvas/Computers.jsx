import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html, OrbitControls, Preload, useGLTF } from "@react-three/drei";
import CanvasLoader from "../Loader";

// Keycap themes. The model's texture has white alpha keys, navy modifiers and
// pink accents (Esc, space); the shader below swaps each group for a theme color.
//   base      alpha keys            legend     printed legends on alpha keys
//   modifier  Shift, Tab, arrows…   accent     Esc and spacebar
//   backlight glowing legends       highlight  hover/press tint
const THEMES = [
  {
    id: "purple",
    name: "Purple",
    colors: {
      base: "#2b2360",
      legend: "#dcd0ff",
      modifier: "#915EFF",
      accent: "#9d74ff",
      backlight: "#c9b3ff",
      highlight: "#e4d9ff",
    },
  },
  {
    id: "blue",
    name: "Ocean blue",
    colors: {
      base: "#132a4f",
      legend: "#cfe6ff",
      modifier: "#2f7bff",
      accent: "#4fb3ff",
      backlight: "#8fd3ff",
      highlight: "#d6ecff",
    },
  },
  {
    id: "red",
    name: "Crimson red",
    colors: {
      base: "#3d1018",
      legend: "#ffd6d9",
      modifier: "#e63946",
      accent: "#ff6b5e",
      backlight: "#ff9a9a",
      highlight: "#ffe0e0",
    },
  },
];
const THEME_KEY = "keyboard-theme";
const THEME_FADE = 6; // higher is a faster color transition

const readTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return THEMES.find((theme) => theme.id === saved) || THEMES[0];
  } catch {
    return THEMES[0];
  }
};

const saveTheme = (id) => {
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    // Storage can be unavailable (private mode); the theme just won't persist
  }
};

const toColors = (theme) =>
  Object.fromEntries(Object.entries(theme.colors).map(([name, hex]) => [name, new THREE.Color(hex)]));

const swirl = ({ colors }) =>
  `conic-gradient(from 45deg, ${colors.modifier}, ${colors.accent}, ${colors.legend}, ${colors.base}, ${colors.modifier})`;

const PRESS_DEPTH = 0.009; // how far a key travels, in the key mesh's local units
const PRESS_DOWN = 0.05; // seconds to bottom out
const PRESS_HOLD = 0.08; // seconds held at the bottom
const PRESS_UP = 0.3; // seconds to spring back
const CLICK_TOLERANCE = 6; // px of pointer travel before a click counts as a drag

// Physical keys on the model's 75% layout, as KeyboardEvent.code values. Rows
// run back (Esc/F-keys) to front (space bar), keys left to right. null marks
// the volume knob.
const KEY_LAYOUT = [
  ["Escape", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Delete", null],
  ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", "Backspace", "Home"],
  ["Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash", "PageUp"],
  ["CapsLock", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", "Enter", "PageDown"],
  ["ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", "ShiftRight", "ArrowUp"],
  ["ControlLeft", "MetaLeft", "AltLeft", "Space", "AltRight", "MetaRight", "ControlRight", "ArrowLeft", "ArrowDown", "ArrowRight"],
];
const ROW_GAP = 0.008; // key mesh units; keys closer than this in depth share a row

// Keys that would otherwise scroll the page while mirroring
const SCROLL_KEYS = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home"]);

// Match each keycap to a KeyboardEvent.code by its position on the board
const mapKeyCodes = (islands) => {
  const sorted = islands
    .map((island, id) => ({ id, x: island.center.x, z: island.center.z }))
    .sort((a, b) => a.z - b.z);

  const rows = [];
  sorted.forEach((key) => {
    const row = rows[rows.length - 1];
    if (row && key.z - row[row.length - 1].z < ROW_GAP) row.push(key);
    else rows.push([key]);
  });

  const codeToIsland = new Map();
  if (rows.length !== KEY_LAYOUT.length) return codeToIsland;
  rows.forEach((row, r) => {
    if (row.length !== KEY_LAYOUT[r].length) return;
    row
      .sort((a, b) => a.x - b.x)
      .forEach((key, c) => {
        const code = KEY_LAYOUT[r][c];
        if (code) codeToIsland.set(code, key.id);
      });
  });
  return codeToIsland;
};

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

const Bubble = ({ background, label, active, onClick, size = 34, hidden = false }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={active}
    tabIndex={hidden ? -1 : 0}
    className={`relative shrink-0 rounded-full transition-transform duration-200 hover:scale-110 ${
      active ? "ring-2 ring-white ring-offset-2 ring-offset-primary" : ""
    }`}
    style={{ width: size, height: size, background }}
  >
    {/* Glassy shine so it reads as a bubble */}
    <span
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{
        background:
          "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.15) 28%, transparent 55%)",
        boxShadow: "inset 0 -3px 8px rgba(0,0,0,0.35), 0 4px 14px rgba(0,0,0,0.4)",
      }}
    />
  </button>
);

const ThemePicker = ({ theme, onChange }) => {
  const [open, setOpen] = useState(false);
  const stops = THEMES.flatMap((t) => [t.colors.modifier, t.colors.accent]);
  const allThemes = `conic-gradient(from 0deg, ${[...stops, stops[0]].join(", ")})`;

  return (
    <div className="flex items-center gap-3 select-none">
      <Bubble
        background={allThemes}
        label={open ? "Close keyboard themes" : "Change keyboard theme"}
        active={open}
        onClick={() => setOpen((value) => !value)}
        size={40}
      />
      <div
        className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${
          open ? "max-w-[220px] opacity-100 p-2" : "max-w-0 opacity-0"
        }`}
      >
        {THEMES.map((option) => (
          <Bubble
            key={option.id}
            background={swirl(option)}
            label={`${option.name} theme`}
            active={option.id === theme.id}
            hidden={!open}
            onClick={() => {
              onChange(option);
              setOpen(false);
            }}
          />
        ))}
      </div>
    </div>
  );
};

const KeyboardModel = ({ isMobile }) => {
  const { scene } = useGLTF("./custom_keyboard/scene.gltf");

  // Work on a private copy so the cached GLTF stays untouched
  const { model, keysMesh, keyData, colors } = useMemo(() => {
    const model = scene.clone(true);
    const colors = toColors(readTheme());
    let keysMesh;
    model.traverse((child) => {
      if (!child.isMesh) return;
      if (child.name.startsWith("Keys")) keysMesh = child;
    });

    keysMesh.geometry = keysMesh.geometry.clone();
    keysMesh.material = keysMesh.material.clone();
    keysMesh.material.onBeforeCompile = (shader) => {
      Object.entries(colors).forEach(([name, color]) => {
        shader.uniforms[`key_${name}`] = { value: color };
      });

      shader.vertexShader = shader.vertexShader.replace(
        "void main() {",
        "attribute float glow;\nvarying float vGlow;\nvoid main() {\n\tvGlow = glow;"
      );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "void main() {",
          `uniform vec3 key_highlight;
uniform vec3 key_base;
uniform vec3 key_legend;
uniform vec3 key_modifier;
uniform vec3 key_accent;
uniform vec3 key_backlight;
varying float vGlow;
void main() {`
        )
        // Recolor the texture by what each texel originally was
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
	vec3 src = diffuseColor.rgb;
	float hi = max(src.r, max(src.g, src.b));
	float sat = hi > 0.0 ? (hi - min(src.r, min(src.g, src.b))) / hi : 0.0;
	float lum = dot(src, vec3(0.2126, 0.7152, 0.0722));
	vec3 neutral = mix(key_legend, key_base, smoothstep(0.08, 0.35, lum));
	vec3 recolored = neutral;
	if (sat > 0.35 && src.b > src.r) recolored = key_modifier;
	else if (sat > 0.35 && src.r > src.b) recolored = key_accent;
	diffuseColor.rgb = recolored;`
        )
        // Legends glow cyan in the original; keep the brightness, change the hue
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
	totalEmissiveRadiance = key_backlight * max(totalEmissiveRadiance.r, max(totalEmissiveRadiance.g, totalEmissiveRadiance.b));`
        )
        // Per-vertex hover/press highlight
        .replace(
          "#include <dithering_fragment>",
          "#include <dithering_fragment>\n\tgl_FragColor.rgb = mix(gl_FragColor.rgb, key_highlight, vGlow * 0.7);"
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

    return { model, keysMesh, keyData: buildKeyIslands(keysMesh.geometry), colors };
  }, [scene]);

  const codeToIsland = useMemo(() => mapKeyCodes(keyData.islands), [keyData]);

  const [theme, setTheme] = useState(readTheme);
  const targetColors = useMemo(() => toColors(theme), [theme]);
  const chooseTheme = (next) => {
    setTheme(next);
    saveTheme(next.id);
  };

  // Per-key animation state: press start time, or -1 when idle
  const pressStart = useRef(new Float32Array(keyData.islands.length).fill(-1));
  const held = useRef(new Set());
  const hovered = useRef(-1);
  const pointerOverModel = useRef(false);
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

  // While the pointer is over the keyboard, mirror real keystrokes on it
  useEffect(() => {
    const isTypingTarget = (target) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

    const handleKeyDown = (event) => {
      if (!pointerOverModel.current || isTypingTarget(event.target)) return;
      const id = codeToIsland.get(event.code);
      if (id === undefined) return;
      if (SCROLL_KEYS.has(event.code)) event.preventDefault();
      if (event.repeat || held.current.has(id)) return;
      held.current.add(id);
      pressKey(id);
    };

    // Release on keyup even if the pointer has left, so no key gets stuck down
    const release = (id) => {
      if (!held.current.delete(id)) return;
      pressStart.current[id] = clock.current - PRESS_DOWN - PRESS_HOLD;
    };
    const handleKeyUp = (event) => {
      const id = codeToIsland.get(event.code);
      if (id !== undefined) release(id);
    };
    const releaseAll = () => held.current.forEach(release);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseAll);
    };
  }, [codeToIsland]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime;
    clock.current = now;

    // Ease the shader's colors toward the selected theme
    const fade = 1 - Math.exp(-THEME_FADE * delta);
    Object.entries(targetColors).forEach(([name, target]) => colors[name].lerp(target, fade));
    if (flashLight.current) flashLight.current.color.copy(colors.modifier);

    const position = keysMesh.geometry.attributes.position;
    const glowAttr = keysMesh.geometry.attributes.glow;
    let dirty = false;

    keyData.islands.forEach((island, id) => {
      const start = pressStart.current[id];
      let depth = 0;
      if (held.current.has(id)) {
        depth = Math.min(1, (now - start) / PRESS_DOWN);
      } else if (start >= 0) {
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
      <pointLight ref={flashLight} intensity={0} distance={4} />
      <Html position={isMobile ? [0, 0.4, 0] : [0, 1.15, 0]} zIndexRange={[10, 0]}>
        {/* Anchor on the main bubble's center so opening the menu doesn't shift it */}
        <div style={{ transform: "translate(-20px, -50%)" }}>
          <ThemePicker theme={theme} onChange={chooseTheme} />
        </div>
      </Html>
      <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.4}>
        <group
          rotation={[0.55, isMobile ? 0 : -0.35, 0]}
          scale={isMobile ? 0.45 : 1}
          position={isMobile ? [0, -1.2, 0] : [0, -1.4, 0]}
        >
          <primitive
            object={model}
            onPointerOver={() => {
              pointerOverModel.current = true;
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              if (e.object !== keysMesh) {
                hovered.current = -1;
                setHovering(false);
                return;
              }
              hovered.current = islandFromEvent(e);
              setHovering(true);
            }}
            onPointerOut={() => {
              pointerOverModel.current = false;
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
