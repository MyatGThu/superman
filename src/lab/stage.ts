// The Lab stage: renderer, lights, camera choreography, and the rep
// clock. This module (plus three.js) is loaded lazily when the Lab
// section approaches the viewport, so the landing bundle stays lean.
//
// Two performers share the stage:
//   - Melina Jones Voss — a Soul-2-generated, rigged 3D scan whose
//     movements are baked animation clips (one GLB per movement,
//     hotlinked from the generation CDN, cached, disposed LRU). Her
//     working muscles are marked with molten glow sprites anchored to
//     her actual bones.
//   - The procedural mannequin (man/woman) — the original articulated
//     rig with pose() choreography and ignitable muscle pads.
// If a character asset can't load (offline, CORS, CDN gone), the stage
// reports it and the Lab falls back to the mannequin — never a blank
// stage.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import gsap from 'gsap'
import { buildMannequin, resetPose, type Mannequin } from './mannequin'
import { EXERCISES, MELINA_MOVEMENTS, type Exercise, type LiveMovement } from './exercises'
import { loadCharacterClip, type CharacterHandle } from './character'
import { MELINA } from './assets'
import type { MuscleId, Sex } from './muscles'

export type BuildKind = 'melina' | 'man' | 'woman'

export interface LabelPoint {
  id: MuscleId
  x: number // px, canvas-relative
  y: number
  visible: boolean // false when the anchor faces away from the camera
}

export interface LabStage {
  /** Swap performer. Character loads are async; state arrives via onCharacterState. */
  setBuild(kind: BuildKind): void
  setExercise(id: string): void
  /** Zoom the camera onto a muscle; null returns to the full body. */
  focusMuscle(m: MuscleId | null): void
  /** Per-frame sink for projected label positions (direct DOM writes). */
  setLabelSink(fn: (pts: LabelPoint[]) => void): void
  dispose(): void
}

const HOME_Y = 0.92 // default camera-target height (mid-torso)
const HOME_POS = new THREE.Vector3(1.5, 1.35, 2.45)
const FOCUS_DIST = 0.85
const CLIP_CACHE_MAX = 3 // animated GLBs kept in memory
const LOAD_TIMEOUT_MS = 30_000

/** Soft molten dot for muscle markers (canvas radial gradient). */
function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30)
  grad.addColorStop(0, 'rgba(255, 214, 170, 1)')
  grad.addColorStop(0.35, 'rgba(249, 115, 22, 0.85)')
  grad.addColorStop(1, 'rgba(249, 115, 22, 0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

export function createStage(
  canvas: HTMLCanvasElement,
  reducedMotion: boolean,
  onCharacterState?: (s: 'loading' | 'ready' | 'failed') => void,
): LabStage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30)
  camera.position.copy(HOME_POS)

  // Lighting is the brand: cold indigo night from one side, molten key
  // from the other — the performer lives between the two temperatures.
  scene.add(new THREE.HemisphereLight(0x353c6e, 0x0a0a0d, 1.5))
  const key = new THREE.DirectionalLight(0xffa066, 1.9)
  key.position.set(2.2, 3, 2.4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x6672ff, 1.4)
  rim.position.set(-2.6, 1.6, -2.2)
  scene.add(rim)

  // Instrument floor: a dark disc with a polar grid.
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.9, metalness: 0.1 }),
  )
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)
  const grid = new THREE.PolarGridHelper(1.2, 8, 4, 48, 0x2b2b36, 0x1c1c24)
  grid.position.y = 0.001
  scene.add(grid)

  // Where "full body" looks — floor movements pull this down (viewY).
  const homeTarget = new THREE.Vector3(0, HOME_Y, 0)

  const controls = new OrbitControls(camera, canvas)
  controls.target.copy(homeTarget)
  controls.enablePan = false
  controls.enableDamping = true
  controls.minDistance = 0.6
  controls.maxDistance = 4.5
  controls.maxPolarAngle = Math.PI * 0.52 // never below the floor
  controls.autoRotate = !reducedMotion
  controls.autoRotateSpeed = 1.1
  // pause the turntable while the visitor is driving
  controls.addEventListener('start', () => (controls.autoRotate = false))
  controls.addEventListener('end', () => {
    if (!reducedMotion) controls.autoRotate = true
  })

  // ---- performers ----
  let build: BuildKind = 'melina'
  let mannequin: Mannequin | null = null
  let character: CharacterHandle | null = null
  const clipCache = new Map<string, CharacterHandle>() // movement id → handle
  let loadSeq = 0 // invalidates stale async loads

  // Muscle markers for the character: three pooled glow sprites.
  const glowTex = makeGlowTexture()
  const markers: THREE.Sprite[] = Array.from({ length: 3 }, () => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
        depthTest: false, // anchors sit inside the body — X-ray through it
        blending: THREE.AdditiveBlending,
      }),
    )
    s.renderOrder = 10
    s.scale.setScalar(0.16)
    s.visible = false
    scene.add(s)
    return s
  })

  // ---- movement state ----
  let movement: Exercise | LiveMovement = MELINA_MOVEMENTS[0]
  let labelSink: ((pts: LabelPoint[]) => void) | null = null
  let elapsed = 0
  let disposed = false

  const isLive = () => build === 'melina'

  function activeLibrary() {
    return isLive() ? MELINA_MOVEMENTS : EXERCISES
  }

  function showMannequin(sex: Sex) {
    if (character) {
      scene.remove(character.root)
      character = null
    }
    if (mannequin) {
      scene.remove(mannequin.rig.root)
      mannequin.dispose()
    }
    mannequin = buildMannequin(sex)
    scene.add(mannequin.rig.root)
    applyProps()
  }

  function applyProps() {
    if (!mannequin) return
    const ex = movement as Exercise
    const prop = 'prop' in ex ? ex.prop : null
    const { barBack, barHands, dbL, dbR } = mannequin.props
    barBack.visible = prop === 'barbell-back'
    barHands.visible = prop === 'barbell-hands'
    dbL.visible = dbR.visible = prop === 'dumbbells'
  }

  /** Load (or reuse) Melina performing the current movement. */
  async function showCharacterClip(id: string) {
    const seq = ++loadSeq
    const url = MELINA.clips[id]
    if (!url) return fail()

    const cached = clipCache.get(id)
    if (cached) return swapIn(cached)

    onCharacterState?.('loading')
    try {
      const handle = await Promise.race([
        loadCharacterClip(url, MELINA.height),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), LOAD_TIMEOUT_MS)),
      ])
      if (seq !== loadSeq || disposed) {
        handle.dispose()
        return
      }
      clipCache.set(id, handle)
      // LRU cap: drop the oldest cached clip that isn't on stage
      if (clipCache.size > CLIP_CACHE_MAX) {
        for (const [key, h] of clipCache) {
          if (h !== handle) {
            clipCache.delete(key)
            h.dispose()
            break
          }
        }
      }
      swapIn(handle)
    } catch {
      if (seq === loadSeq && !disposed) fail()
    }

    function swapIn(handle: CharacterHandle) {
      if (mannequin) {
        scene.remove(mannequin.rig.root)
        mannequin.dispose()
        mannequin = null
      }
      if (character && character !== handle) scene.remove(character.root)
      character = handle
      // reduced motion: hold a readable mid-rep frame instead of moving
      if (reducedMotion) character.update(0.4 * (movement.tempo ?? 2.5))
      scene.add(character.root)
      onCharacterState?.('ready')
    }

    function fail() {
      onCharacterState?.('failed')
    }
  }

  // ---- per-frame ----
  const clock = new THREE.Clock()
  const v = new THREE.Vector3()

  function muscleWorldPos(m: MuscleId, out: THREE.Vector3): THREE.Vector3 {
    if (character) return character.anchorPosition(m, out)
    const anchor = mannequin?.padAnchors.get(m)
    if (anchor) return anchor.getWorldPosition(out)
    return out.set(0, HOME_Y, 0)
  }

  function frame() {
    if (disposed) return
    const dt = Math.min(0.05, clock.getDelta())
    if (!reducedMotion) elapsed += dt

    // Rep phase 0→1→0: drives pad ignition and marker pulse.
    const tempo = movement.tempo || 2.5
    const cyc = (elapsed % tempo) / tempo
    const raw = reducedMotion ? 0.65 : (1 - Math.cos(cyc * Math.PI * 2)) / 2
    const p = raw * raw * (3 - 2 * raw)

    if (mannequin) {
      const ex = movement as Exercise
      resetPose(mannequin.rig)
      if ('pose' in ex) ex.pose(mannequin.rig, p)
      for (const [m, mat] of mannequin.padMats) {
        const active = movement.muscles.includes(m)
        const target = active ? 0.55 + 0.9 * p : 0
        mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.2
      }
    }

    if (character) {
      if (!reducedMotion) character.update(dt)
      // markers ride the bones and burn hardest at contraction
      markers.forEach((s, i) => {
        const m = movement.muscles[i]
        if (!m) {
          s.visible = false
          return
        }
        s.visible = true
        muscleWorldPos(m, v)
        s.position.copy(v)
        const primary = i === 0 ? 1 : 0.7
        s.scale.setScalar((0.13 + 0.05 * p) * primary)
        s.material.opacity = (0.55 + 0.45 * p) * primary
      })
    } else {
      markers.forEach((s) => (s.visible = false))
    }

    controls.update()
    renderer.render(scene, camera)

    // Project label anchors for the active muscles into canvas space.
    if (labelSink) {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const pts: LabelPoint[] = movement.muscles.map((m) => {
        muscleWorldPos(m, v)
        const behind = v.clone().sub(camera.position).normalize()
        // hide the tag when its anchor faces away (occluded by the body)
        const normal = v.clone().sub(homeTarget).setY(0).normalize()
        const facing = normal.dot(behind) < 0.25
        v.project(camera)
        return {
          id: m,
          x: (v.x * 0.5 + 0.5) * w,
          y: (-v.y * 0.5 + 0.5) * h,
          visible: facing && v.z < 1,
        }
      })
      labelSink(pts)
    }
  }
  renderer.setAnimationLoop(frame)

  // Render only while the canvas is actually on screen.
  const io = new IntersectionObserver(([entry]) => {
    renderer.setAnimationLoop(entry.isIntersecting && !disposed ? frame : null)
    if (entry.isIntersecting) clock.getDelta() // swallow the paused gap
  })
  io.observe(canvas)

  // Track the canvas box (the section is responsive).
  const resize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  // ---- camera choreography ----
  const vec = (v3: THREE.Vector3) => ({ x: v3.x, y: v3.y, z: v3.z })

  function flyTo(target: THREE.Vector3, distance: number) {
    const dir = camera.position.clone().sub(controls.target).normalize()
    const pos = target.clone().add(dir.multiplyScalar(distance))
    gsap.killTweensOf([camera.position, controls.target])
    const dur = reducedMotion ? 0 : 0.9
    gsap.to(controls.target, { ...vec(target), duration: dur, ease: 'expo.out' })
    gsap.to(camera.position, { ...vec(pos), duration: dur, ease: 'expo.out' })
  }

  // The turntable keeps spinning while focused — orbiting a burning
  // muscle up close IS the shot.
  function focusMuscle(m: MuscleId | null) {
    if (m) {
      flyTo(muscleWorldPos(m, new THREE.Vector3()), FOCUS_DIST)
    } else {
      flyTo(homeTarget, HOME_POS.distanceTo(homeTarget))
    }
  }

  return {
    setBuild(kind) {
      if (kind === build) return
      build = kind
      // movement ids differ between libraries; setExercise follows from
      // the Lab (it owns the drawn movement), so here we only swap the
      // performer for same-library switches (man ↔ woman).
      if (!isLive()) showMannequin(kind as Sex)
    },

    setExercise(id) {
      movement = activeLibrary().find((e) => e.id === id) ?? activeLibrary()[0]
      elapsed = 0
      homeTarget.y = movement.viewY ?? HOME_Y
      if (isLive()) {
        void showCharacterClip(movement.id)
      } else {
        if (!mannequin) showMannequin(build as Sex)
        applyProps()
      }
      // A new movement always opens on the whole body; the Lab dives
      // onto the primary muscle after the first rep.
      focusMuscle(null)
    },

    focusMuscle,
    setLabelSink(fn) {
      labelSink = fn
    },

    dispose() {
      disposed = true
      loadSeq++
      renderer.setAnimationLoop(null)
      io.disconnect()
      ro.disconnect()
      controls.dispose()
      mannequin?.dispose()
      clipCache.forEach((h) => h.dispose())
      clipCache.clear()
      glowTex.dispose()
      markers.forEach((s) => s.material.dispose())
      renderer.dispose()
    },
  }
}
