// The Lab stage: renderer, lights, camera choreography, and the rep
// clock. This module (plus three.js) is loaded lazily when the Lab
// section approaches the viewport, so the landing bundle stays lean.
//
// The stage owns everything per-frame: posing the rig, pulsing the
// active muscle pads with the rep, auto-orbiting, and projecting
// muscle-label anchor points to screen space for the React overlay.
// React only ever calls the imperative API below.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import gsap from 'gsap'
import { buildMannequin, resetPose, type Mannequin } from './mannequin'
import { EXERCISES, type Exercise } from './exercises'
import type { MuscleId, Sex } from './muscles'

export interface LabelPoint {
  id: MuscleId
  x: number // px, canvas-relative
  y: number
  visible: boolean // false when the pad faces away from the camera
}

export interface LabStage {
  setSex(sex: Sex): void
  setExercise(id: string): void
  /** Zoom the camera onto a muscle pad; null returns to the full body. */
  focusMuscle(m: MuscleId | null): void
  /** Per-frame sink for projected label positions (direct DOM writes). */
  setLabelSink(fn: (pts: LabelPoint[]) => void): void
  dispose(): void
}

const HOME_Y = 0.92 // default camera-target height (mid-torso)
const HOME_POS = new THREE.Vector3(1.5, 1.35, 2.45)
const FOCUS_DIST = 0.85

export function createStage(canvas: HTMLCanvasElement, reducedMotion: boolean): LabStage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30)
  camera.position.copy(HOME_POS)

  // Lighting is the brand: cold indigo night from one side, molten key
  // from the other — the mannequin lives between the two temperatures.
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

  // Where "full body" looks — floor exercises pull this down (viewY).
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

  // ---- state ----
  let mannequin: Mannequin = buildMannequin('man')
  scene.add(mannequin.rig.root)
  let exercise: Exercise = EXERCISES[0]
  let focused: MuscleId | null = null
  let labelSink: ((pts: LabelPoint[]) => void) | null = null
  let elapsed = 0
  let disposed = false

  function applyProps() {
    const { barBack, barHands, dbL, dbR } = mannequin.props
    barBack.visible = exercise.prop === 'barbell-back'
    barHands.visible = exercise.prop === 'barbell-hands'
    dbL.visible = dbR.visible = exercise.prop === 'dumbbells'
  }
  applyProps()

  // ---- per-frame ----
  const clock = new THREE.Clock()
  const v = new THREE.Vector3()

  function frame() {
    if (disposed) return
    const dt = Math.min(0.05, clock.getDelta())
    if (!reducedMotion) elapsed += dt

    // Rep progress: smooth ping-pong of the tempo. Reduced motion holds
    // a readable mid-contraction pose instead of animating.
    const cyc = (elapsed % exercise.tempo) / exercise.tempo
    const raw = reducedMotion ? 0.65 : (1 - Math.cos(cyc * Math.PI * 2)) / 2
    const p = raw * raw * (3 - 2 * raw) // smoothstep: eased turnarounds

    resetPose(mannequin.rig)
    exercise.pose(mannequin.rig, p)

    // Fire the working muscles WITH the rep — contraction glows hardest.
    for (const [m, mat] of mannequin.padMats) {
      const active = exercise.muscles.includes(m)
      const target = active ? 0.55 + 0.9 * p : 0
      mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.2
    }

    controls.update()
    renderer.render(scene, camera)

    // Project label anchors for the active muscles into canvas space.
    if (labelSink) {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const pts: LabelPoint[] = exercise.muscles.map((m) => {
        const anchor = mannequin.padAnchors.get(m)!
        anchor.getWorldPosition(v)
        const behind = v.clone().sub(camera.position).normalize()
        // hide the tag when its pad faces away (occluded by the body)
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
  function flyTo(target: THREE.Vector3, distance: number) {
    const dir = camera.position.clone().sub(controls.target).normalize()
    const pos = target.clone().add(dir.multiplyScalar(distance))
    gsap.killTweensOf([camera.position, controls.target])
    const dur = reducedMotion ? 0 : 0.9
    gsap.to(controls.target, { ...vec(target), duration: dur, ease: 'expo.out' })
    gsap.to(camera.position, { ...vec(pos), duration: dur, ease: 'expo.out' })
  }
  const vec = (v3: THREE.Vector3) => ({ x: v3.x, y: v3.y, z: v3.z })

  // The turntable keeps spinning while focused — orbiting a burning
  // muscle up close IS the shot.
  function focusMuscle(m: MuscleId | null) {
    focused = m
    if (m) {
      const anchor = mannequin.padAnchors.get(m)!
      const p = new THREE.Vector3()
      anchor.getWorldPosition(p)
      flyTo(p, FOCUS_DIST)
    } else {
      flyTo(homeTarget, HOME_POS.distanceTo(homeTarget))
    }
  }

  return {
    setSex(sex) {
      scene.remove(mannequin.rig.root)
      mannequin.dispose()
      mannequin = buildMannequin(sex)
      scene.add(mannequin.rig.root)
      applyProps()
      if (focused) focusMuscle(focused) // re-anchor onto the new body
    },

    setExercise(id) {
      exercise = EXERCISES.find((e) => e.id === id) ?? EXERCISES[0]
      elapsed = 0
      applyProps()
      homeTarget.y = exercise.viewY ?? HOME_Y
      // A new movement always opens on the whole body, then the camera
      // dives onto the primary muscle once the first rep has shown it.
      focusMuscle(null)
    },

    focusMuscle,
    setLabelSink(fn) {
      labelSink = fn
    },

    dispose() {
      disposed = true
      renderer.setAnimationLoop(null)
      io.disconnect()
      ro.disconnect()
      controls.dispose()
      mannequin.dispose()
      renderer.dispose()
    },
  }
}
