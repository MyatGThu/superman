// The movement library. Every exercise is procedural choreography: a
// pose() function that writes joint angles for a rep progress value
// p ∈ [0, 1] (0 = start/lockout, 1 = full contraction/bottom).
// The stage turns wall-clock time into p with a smooth ping-pong, so
// each rep eases into its turnaround like a controlled lift, not a
// metronome.
//
// Conventions (see mannequin.ts): segments hang along -Y from their
// joint group; the figure faces +Z. With three.js X-rotations that
// means NEGATIVE rotation.x swings a limb forward, POSITIVE spine
// rotation.x leans the torso forward, POSITIVE knee rotation.x folds
// the shin backward.
import type { Rig } from './mannequin'
import type { MuscleId } from './muscles'

export type PropKind = 'barbell-back' | 'barbell-hands' | 'dumbbells' | null

export interface Exercise {
  id: string
  name: string
  cue: string // one coaching line, shown in the panel
  tempo: number // seconds per full rep (down + up)
  prop: PropKind
  muscles: MuscleId[] // primary group first — the camera zooms to it
  viewY?: number // camera target height; floor work sits lower (default 0.92)
  pose(rig: Rig, p: number): void
}

/** Keep both feet planted while the legs fold: given hip flexion a and
 *  knee flexion k, place the pelvis so the ankles stay at z≈0, y≈foot.
 *  (Hips travel back as the thighs fold forward — a hip-hinge squat.) */
function plantFeet(rig: Rig, a: number, k: number) {
  const { thigh, shin, foot } = rig.dims
  rig.root.position.y = foot + thigh * Math.cos(a) + shin * Math.cos(k - a)
  rig.root.position.z = -thigh * Math.sin(a) + shin * Math.sin(k - a)
  for (const s of ['L', 'R'] as const) {
    rig[`hip${s}`].rotation.x = -a
    rig[`knee${s}`].rotation.x = k
    // level the feet against the accumulated leg rotation
    rig[`ankle${s}`].rotation.x = a - k
  }
}

/** Symmetric arm helper: shoulder flexion f (arm forward/up from the
 *  side), elbow flexion e (0 = straight). */
function arms(rig: Rig, f: number, e: number) {
  for (const s of ['L', 'R'] as const) {
    rig[`shoulder${s}`].rotation.set(-f, 0, 0)
    rig[`elbow${s}`].rotation.x = -e
  }
}

/** A movement performed by the scanned character: same panel fields as
 *  a procedural Exercise, but the motion is a baked animation clip
 *  (GLB URL in assets.ts) instead of a pose() function. */
export interface LiveMovement {
  id: string
  name: string
  cue: string
  tempo: number // seconds per rep — drives the muscle-marker pulse
  muscles: MuscleId[]
  viewY?: number
}

// Melina's set — mapped to the animation library's WorkingOut clips.
export const MELINA_MOVEMENTS: LiveMovement[] = [
  {
    id: 'air-squat',
    name: 'Air squat',
    cue: 'Hips back, chest proud, stand up like you mean it.',
    tempo: 2.6,
    muscles: ['quads', 'glutes', 'core'],
  },
  {
    id: 'push-up',
    name: 'Push-up',
    cue: 'One straight line, chest to the floor, floor to arm’s length.',
    tempo: 2.4,
    viewY: 0.45,
    muscles: ['pecs', 'triceps', 'core'],
  },
  {
    id: 'curl',
    name: 'Biceps curl',
    cue: 'Elbows pinned. The weight travels; you don’t.',
    tempo: 2.2,
    muscles: ['biceps'],
  },
  {
    id: 'kb-swing',
    name: 'Kettlebell swing',
    cue: 'It’s a hinge, not a squat — the hips throw it, the arms steer.',
    tempo: 1.8,
    muscles: ['hams', 'glutes', 'core'],
  },
  // Sumo high pull (clip 331) and sit-up (clip 330) were cut when the
  // wardrobe was regenerated — each movement is one 8-credit rigging
  // job away from returning; see README "The Lab".
]

export const EXERCISES: Exercise[] = [
  {
    id: 'squat',
    name: 'Back squat',
    cue: 'Bar on your back, hips to the floor, stand up angry.',
    tempo: 3.4,
    prop: 'barbell-back',
    muscles: ['quads', 'glutes', 'core'],
    pose(rig, p) {
      plantFeet(rig, 0.14 + p * 1.28, 0.16 + p * 1.92)
      rig.spine.rotation.x = p * 0.42
      // grip the racked bar: upper arms out along it, forearms rolled
      // up to the hands (pure Z-roll keeps the geometry planar)
      for (const s of ['L', 'R'] as const) {
        const m = s === 'L' ? -1 : 1
        rig[`shoulder${s}`].rotation.set(0.3, 0, m * 1.35)
        rig[`elbow${s}`].rotation.set(0, 0, m * 1.79)
      }
    },
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    cue: 'Hinge, wedge, and push the world away from the bar.',
    tempo: 3.6,
    prop: 'barbell-hands',
    muscles: ['hams', 'glutes', 'core'],
    pose(rig, p) {
      const lean = p * 0.92
      plantFeet(rig, 0.1 + p * 0.52, 0.12 + p * 0.55)
      rig.spine.rotation.x = lean
      // arms stay a vertical plumb line: shoulder flexion cancels the
      // torso lean (helper negates, so f = +lean → rotation −lean)
      arms(rig, lean, 0.02)
    },
  },
  {
    id: 'pushup',
    name: 'Push-up',
    cue: 'One straight line, chest to the floor, floor to arm’s length.',
    tempo: 2.6,
    prop: null,
    muscles: ['pecs', 'triceps', 'core'],
    viewY: 0.42, // floor work: aim the camera at the plank line
    pose(rig, p) {
      const PITCH = 1.35 // whole-body pitch onto the hands
      const e = 0.35 + p * 1.1 // elbow flexion drives the descent
      const { upperArm, foreArm, thigh, shin } = rig.dims
      // hands stay planted: shoulder height = FK reach of the bent arm,
      // with the forearm held vertical (shoulder drifts, elbow flexes)
      const reach = upperArm * Math.cos(e) + foreArm
      // pelvis sits ON the shoulder→feet line (no pike): a touch lower
      // than the raw torso projection
      const pelvisY = reach - 0.115
      rig.root.rotation.x = PITCH
      rig.root.position.set(0, pelvisY, -0.12)
      // legs slope from the pelvis down to the planted toes
      const legTilt = Math.acos(Math.min(1, (pelvisY - 0.06) / (thigh + shin)))
      for (const s of ['L', 'R'] as const) {
        rig[`hip${s}`].rotation.x = legTilt - PITCH
        rig[`knee${s}`].rotation.x = 0.06
        rig[`ankle${s}`].rotation.x = -0.55 // toes staked into the floor
        // upper arm drifts toward the feet, forearm stays plumb
        rig[`shoulder${s}`].rotation.set(-PITCH + e, 0, 0)
        rig[`elbow${s}`].rotation.x = -e
      }
    },
  },
  {
    id: 'press',
    name: 'Overhead press',
    cue: 'Dumbbells to the sky — lock it out where the doubt lives.',
    tempo: 2.9,
    prop: 'dumbbells',
    muscles: ['delts', 'triceps', 'core'],
    pose(rig, p) {
      plantFeet(rig, 0.08, 0.1)
      rig.spine.rotation.x = -0.05 * p
      // from the rack (upper arm near horizontal, forearm vertical)
      // to overhead lockout
      arms(rig, 1.25 + p * 1.65, 1.9 - p * 1.82)
    },
  },
  {
    id: 'curl',
    name: 'Biceps curl',
    cue: 'Elbows pinned. The dumbbell travels; you don’t.',
    tempo: 2.4,
    prop: 'dumbbells',
    muscles: ['biceps'],
    pose(rig, p) {
      plantFeet(rig, 0.08, 0.1)
      arms(rig, 0.12, 0.15 + p * 1.95)
    },
  },
  {
    id: 'row',
    name: 'Bent-over row',
    cue: 'Hinge and drag the bar into your hips — row, don’t shrug.',
    tempo: 2.7,
    prop: 'barbell-hands',
    muscles: ['lats', 'biceps', 'hams'],
    pose(rig, p) {
      const lean = 0.88
      plantFeet(rig, 0.4, 0.45)
      rig.spine.rotation.x = lean
      // hang plumb, then drag the elbows back past the ribs
      arms(rig, lean - p * 0.55, 0.08 + p * 1.15)
    },
  },
]

/** Random movement from a library, never repeating the current one. */
export function drawFrom<T extends { id: string }>(list: T[], excludeId?: string): T {
  const pool = list.filter((e) => e.id !== excludeId)
  return pool[Math.floor(Math.random() * pool.length)]
}
