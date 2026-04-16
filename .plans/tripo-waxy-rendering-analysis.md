# Tripo Waxy Rendering Analysis

## Problem Statement

Models rendered in "RGB" (normal/full texture) mode look waxy/plastic-like, while they look correct in "Clay" mode and "Base Color" (UV) mode. The user reported: "nagyon viaszosak rgb modban, base color modban nem" (very waxy in RGB mode, not in base color mode).

## Root Cause Analysis

### PRIMARY CAUSE (Confidence: High): Missing Environment Map

**Location:** `ThreeViewer.jsx`, lines 55-69

The ThreeViewer renderer is configured with PBR-friendly settings but **no environment map is ever created or assigned**:

```js
// ThreeViewer.jsx, lines 55-63
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
```

**Evidence:**
- A full-text search for `envMap`, `PMREMGenerator`, `RoomEnvironment`, `HDRI`, `KTX`, `Equirectangular`, and `environment` across the entire `src/` directory returns **zero results** (except a reference to `envMapIntensity: 0` in the clay material, which explicitly disables it).
- `threeHelpers.js` line 357 simply stores the original materials from the GLB: `s.origMaterials.set(n.uuid, n.material)`. These are Tripo-generated `MeshStandardMaterial` instances with PBR textures (albedo, normal, roughness, metalness maps). Without an `envMap`, the specular/reflection component of PBR has nothing to reflect, producing a flat, waxy appearance.

**Why this matters for PBR:**
PBR materials (`MeshStandardMaterial`) compute specular reflections from an environment map. When `envMap` is null, the reflection term is effectively zero. The surface then only shows:
1. Diffuse color from the albedo map
2. Direct light from the directional lights
3. Ambient fill from the ambient light

This combination produces a flat, diffuse-only look that reads as "waxy" or "plastic" because there is no specular contrast or micro-reflection variation to give the surface visual depth.

### SECONDARY CAUSE (Confidence: Medium): ACESFilmicToneMapping + Exposure 1.4

**Location:** `ThreeViewer.jsx`, lines 62-63

```js
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
```

**Analysis:**
- ACESFilmicToneMapping is a filmic tone mapping curve designed for HDR content. It compresses highlights and lifts shadows.
- On a model without an environment map (no HDR highlights to compress), the tone mapping curve **only serves to flatten contrast** further -- it takes already-flat lighting and compresses it even more.
- Exposure 1.4 amplifies everything uniformly, washing out subtle tonal differences that would help distinguish surface materials.

**Why this doesn't affect clay mode:**
The clay material (line 149-151 of `threeHelpers.js`) uses `MeshStandardMaterial` with `metalness: 0`, `roughness: 0.82`, and `envMapIntensity: 0`. With no specular component and high roughness, the ACES curve has much less to flatten -- the material is essentially diffuse-only already, which the clay lighting (specific hemisphere + directional setup) is tuned to present well.

### TERTIARY CAUSE (Confidence: Low-Medium): Tripo Material Defaults

**Location:** `loadGLB()` in `threeHelpers.js`, line 357; `TripoPanel.jsx`, line 259

**Analysis:**
- Tripo generates models with `pbr: false` by default (line 259: `const [pbrOn, setPbrOn] = useState(false)`). When PBR textures are not requested, Tripo sends a simpler albedo-only texture set.
- Even when `pbr: true` is enabled, the roughness/metalness values encoded in the PBR maps may be suboptimal for display without an environment map.
- The GLTFLoader creates `MeshStandardMaterial` instances with whatever the GLB specifies. If the roughness map is mid-range (~0.5-0.7), the material will look matte but still waxy because it reflects nothing interesting.

**Note:** The user reported "base color mode is not waxy." Base Color (UV) mode uses `MeshBasicMaterial` (line 164 of `threeHelpers.js`), which is unlit -- it shows the raw albedo texture with no lighting computation at all. The fact that the raw albedo looks fine confirms the texture itself is correct; the issue is purely in how the lit rendering pipeline handles it.

## Why Each Mode Behaves Differently

| Mode | Material Type | Lighting | envMap | Result |
|------|--------------|----------|--------|--------|
| **Clay** | `MeshStandardMaterial` (gray, metalness=0, roughness=0.82, envMapIntensity=0) | Hemisphere + 3 directional lights (neutral) | Not used (intensity=0) | Clean, matte look -- diffuse-only, no PBR artifacts |
| **UV / Base Color** | `MeshBasicMaterial` (map = albedo texture) | **None** (basic material is unlit) | N/A | Raw texture -- accurate colors, no waxy effect |
| **Normal / RGB** | `MeshStandardMaterial` from GLB (PBR textures) | Studio/Outdoor/Dramatic lights | **Not set (null)** | **Waxy** -- PBR specular has nothing to reflect, tone mapping flattens contrast |

## Recommended Fixes

### Fix 1: Add Environment Map (Highest Impact)

**File:** `ThreeViewer.jsx`, after renderer setup (around line 69)

Add an environment map using Three.js `PMREMGenerator` with `RoomEnvironment`:

```js
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// After renderer creation, before S.current assignment:
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const neutralEnvironment = pmremGenerator.fromScene(
  new RoomEnvironment(),
  0.04
).texture;
scene.environment = neutralEnvironment;
// Optionally also set for reflections:
// scene.environmentMap = neutralEnvironment; // applied via material envMap
```

This provides realistic, neutral reflections for PBR materials. `RoomEnvironment` creates a soft studio-like environment with subtle reflections that give surfaces natural specular variation without being distracting.

**Expected effect:** The waxy appearance should be immediately eliminated. PBR materials will show proper specular highlights, micro-reflections, and surface depth.

### Fix 2: Adjust Tone Mapping Exposure

**File:** `ThreeViewer.jsx`, line 63

Change exposure from 1.4 to 1.0-1.2:

```js
renderer.toneMappingExposure = 1.0;
```

Or consider using `NeutralToneMapping` (available in Three.js r183) instead of ACES for a flatter, more accurate look that doesn't compress contrast:

```js
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
```

**Expected effect:** Slightly more contrast in the rendered image, less washed-out appearance. Less impactful than Fix 1.

### Fix 3: Increase Ambient Light Intensity for Normal Mode

**File:** `threeHelpers.js`, lines 102-109 (studio lighting)

The studio ambient is at 0.4 * k. If the model has low-reflectivity PBR textures, this may not be enough fill. Consider bumping to 0.6:

```js
lightGroup.add(new THREE.AmbientLight(0xffffff, 0.6 * k));
```

**Expected effect:** Minor improvement in shadow areas. Not a primary fix.

## Recommended Priority

1. **Fix 1 (Environment Map)** -- This is the primary root cause. Adding an environment map is standard practice for any PBR renderer. Without it, PBR materials are fundamentally broken (no specular component). This single change is expected to resolve 80-90% of the waxy appearance.

2. **Fix 2 (Tone Mapping)** -- Secondary refinement. Once the environment map is in place, the tone mapping settings should be adjusted to complement the new reflections. Lowering exposure or switching to Neutral tone mapping will prevent over-washing.

3. **Fix 3 (Ambient Light)** -- Minor tweak. May be needed after Fix 1 to fine-tune the lighting balance.

## Verification Plan

After implementing Fix 1:
- Generate a Tripo model with `pbr: true`
- View in RGB/Normal mode
- The model should show specular highlights, natural surface variation, and non-waxy appearance
- Compare against clay mode (should still look correct) and base color mode (should still show raw texture accurately)
- Test across all lighting presets (studio, outdoor, dramatic) to ensure the envMap works with each
