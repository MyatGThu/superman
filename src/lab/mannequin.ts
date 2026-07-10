// The mannequin: a fully procedural articulated figure built from
// capsules and spheres — no downloaded models, no rigs to license.
// It is deliberately a training-room dummy, not a fake human: an iron
// body with "muscle pads" bolted onto it that ignite when a movement
// recruits them.
//
// Skeleton: root (pelvis) → spine → head, shoulders → elbows → hands,
// hips → knees → ankles. Segments extend along -Y from their joint;
// the figure faces +Z. Man/woman share the skeleton and differ in
// measured proportions (shoulder/hip width, segment lengths, radii).
import * as THREE from 'three'
import type { MuscleId, Sex } from './muscles'

export interface Rig {
  root: THREE.Group
  spine: THREE.Group
  shoulderL: THREE.Group
  shoulderR: THREE.Group
  elbowL: THREE.Group
  elbowR: THREE.Group
  hipL: THREE.Group
  hipR: THREE.Group
  kneeL: THREE.Group
  kneeR: THREE.Group
  ankleL: THREE.Group
  ankleR: THREE.Group
  dims: { thigh: number; shin: number; foot: number; upperArm: number; foreArm: number }
}

export interface Mannequin {
  rig: Rig
  /** One material per muscle group — pulse emissiveIntensity to fire it. */
  padMats: Map<MuscleId, THREE.MeshStandardMaterial>
  /** Representative pad object per muscle: label anchor & zoom target. */
  padAnchors: Map<MuscleId, THREE.Object3D>
  props: { barBack: THREE.Group; barHands: THREE.Group; dbL: THREE.Group; dbR: THREE.Group }
  dispose(): void
}

// Proportions, in meters. Same bones, different bodies.
const BODIES = {
  man: {
    shoulderW: 0.225,
    hipW: 0.1,
    torsoUp: 0.36, // waist → shoulder line
    chestR: 0.155,
    pelvisR: 0.125,
    headR: 0.1,
    thigh: 0.44,
    shin: 0.42,
    foot: 0.06,
    upperArm: 0.3,
    foreArm: 0.26,
    legR: 0.055,
    armR: 0.042,
  },
  woman: {
    shoulderW: 0.185,
    hipW: 0.115,
    torsoUp: 0.34,
    chestR: 0.13,
    pelvisR: 0.14,
    headR: 0.094,
    thigh: 0.42,
    shin: 0.4,
    foot: 0.055,
    upperArm: 0.28,
    foreArm: 0.24,
    legR: 0.048,
    armR: 0.036,
  },
} satisfies Record<Sex, Record<string, number>>

const IRON = { color: 0x23232b, roughness: 0.42, metalness: 0.68 }
const JOINT = { color: 0x15151b, roughness: 0.5, metalness: 0.6 }
const PAD = { color: 0x2f2f3a, roughness: 0.55, metalness: 0.3 }
const MOLTEN = 0xf97316
const STEEL = { color: 0x3a3a44, roughness: 0.3, metalness: 0.9 }

export function buildMannequin(sex: Sex): Mannequin {
  const B = BODIES[sex]
  const disposables: { dispose(): void }[] = []
  const iron = track(new THREE.MeshStandardMaterial(IRON))
  const joint = track(new THREE.MeshStandardMaterial(JOINT))
  const steel = track(new THREE.MeshStandardMaterial(STEEL))

  function track<T extends { dispose(): void }>(x: T): T {
    disposables.push(x)
    return x
  }

  /** Capsule segment hanging from its joint: spans y ∈ [0, -len]. */
  function segment(len: number, r: number, mat = iron): THREE.Mesh {
    const geo = track(new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 12))
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = -len / 2
    return mesh
  }

  function ball(r: number, mat = joint): THREE.Mesh {
    return new THREE.Mesh(track(new THREE.SphereGeometry(r, 16, 12)), mat)
  }

  function group(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
    const g = new THREE.Group()
    g.position.set(x, y, z)
    parent.add(g)
    return g
  }

  // ---- skeleton ----
  const root = new THREE.Group()
  root.position.y = B.foot + B.thigh + B.shin

  // pelvis block (lying across X)
  const pelvis = new THREE.Mesh(
    track(new THREE.CapsuleGeometry(B.pelvisR * 0.82, B.hipW * 2, 4, 12)),
    iron,
  )
  pelvis.rotation.z = Math.PI / 2
  root.add(pelvis)

  const spine = group(root, 0, 0.1, 0)
  // chest block across X, up near the shoulder line
  const chest = new THREE.Mesh(
    track(new THREE.CapsuleGeometry(B.chestR * 0.9, B.shoulderW * 1.5, 4, 12)),
    iron,
  )
  chest.rotation.z = Math.PI / 2
  chest.position.y = B.torsoUp - 0.09
  spine.add(chest)
  // waist column connecting pelvis and chest
  const waist = segment(B.torsoUp * 0.6, B.chestR * 0.62)
  waist.position.y = B.torsoUp * 0.35
  spine.add(waist)
  // head
  const head = ball(B.headR, iron)
  head.position.y = B.torsoUp + B.headR + 0.07
  spine.add(head)
  const neck = segment(0.1, 0.035)
  neck.position.y = B.torsoUp + 0.06
  spine.add(neck)

  // arms
  const shoulderL = group(spine, -B.shoulderW, B.torsoUp, 0)
  const shoulderR = group(spine, B.shoulderW, B.torsoUp, 0)
  const elbowL = group(shoulderL, 0, -B.upperArm, 0)
  const elbowR = group(shoulderR, 0, -B.upperArm, 0)
  for (const [sh, el] of [
    [shoulderL, elbowL],
    [shoulderR, elbowR],
  ] as const) {
    sh.add(ball(B.armR * 1.5))
    sh.add(segment(B.upperArm, B.armR))
    el.add(ball(B.armR * 1.3))
    el.add(segment(B.foreArm, B.armR * 0.85))
    const hand = ball(B.armR * 1.25, iron)
    hand.position.y = -B.foreArm - 0.02
    el.add(hand)
  }

  // legs
  const hipL = group(root, -B.hipW, -0.02, 0)
  const hipR = group(root, B.hipW, -0.02, 0)
  const kneeL = group(hipL, 0, -B.thigh, 0)
  const kneeR = group(hipR, 0, -B.thigh, 0)
  const ankleL = group(kneeL, 0, -B.shin, 0)
  const ankleR = group(kneeR, 0, -B.shin, 0)
  for (const [hip, knee, ankle] of [
    [hipL, kneeL, ankleL],
    [hipR, kneeR, ankleR],
  ] as const) {
    hip.add(ball(B.legR * 1.4))
    hip.add(segment(B.thigh, B.legR))
    knee.add(ball(B.legR * 1.25))
    knee.add(segment(B.shin, B.legR * 0.82))
    // foot: a low capsule pointing forward (+Z)
    const foot = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(B.foot * 0.55, 0.14, 4, 10)),
      iron,
    )
    foot.rotation.x = Math.PI / 2
    foot.position.set(0, -B.foot * 0.7, 0.05)
    ankle.add(foot)
  }

  // ---- muscle pads ----
  const padMats = new Map<MuscleId, THREE.MeshStandardMaterial>()
  const padAnchors = new Map<MuscleId, THREE.Object3D>()

  function padMat(m: MuscleId): THREE.MeshStandardMaterial {
    let mat = padMats.get(m)
    if (!mat) {
      mat = track(
        new THREE.MeshStandardMaterial({ ...PAD, emissive: MOLTEN, emissiveIntensity: 0 }),
      )
      padMats.set(m, mat)
    }
    return mat
  }

  /** A flattened-sphere muscle pad. The first pad placed for a muscle
   *  becomes its label/zoom anchor. */
  function pad(
    m: MuscleId,
    parent: THREE.Object3D,
    pos: [number, number, number],
    scale: [number, number, number],
  ) {
    const mesh = new THREE.Mesh(track(new THREE.SphereGeometry(1, 14, 10)), padMat(m))
    mesh.position.set(...pos)
    mesh.scale.set(...scale)
    parent.add(mesh)
    if (!padAnchors.has(m)) padAnchors.set(m, mesh)
  }

  const chestY = B.torsoUp - 0.08
  const sexChest = sex === 'woman' ? 1.12 : 1 // pads sit a touch prouder
  pad('pecs', spine, [0.075, chestY, B.chestR * 0.72], [0.065, 0.052 * sexChest, 0.045 * sexChest])
  pad('pecs', spine, [-0.075, chestY, B.chestR * 0.72], [0.065, 0.052 * sexChest, 0.045 * sexChest])
  pad('core', spine, [0, 0.16, B.chestR * 0.62], [0.075, 0.1, 0.035])
  pad('lats', spine, [0.095, 0.2, -B.chestR * 0.55], [0.05, 0.11, 0.04])
  pad('lats', spine, [-0.095, 0.2, -B.chestR * 0.55], [0.05, 0.11, 0.04])
  for (const sh of [shoulderL, shoulderR]) {
    pad('delts', sh, [0, 0.01, 0], [0.062, 0.058, 0.062])
    pad('biceps', sh, [0, -B.upperArm * 0.5, B.armR * 0.75], [0.03, 0.075, 0.032])
    pad('triceps', sh, [0, -B.upperArm * 0.5, -B.armR * 0.75], [0.03, 0.075, 0.032])
  }
  pad('glutes', root, [0.062, -0.035, -B.pelvisR * 0.72], [0.055, 0.06, 0.05])
  pad('glutes', root, [-0.062, -0.035, -B.pelvisR * 0.72], [0.055, 0.06, 0.05])
  for (const hip of [hipL, hipR]) {
    pad('quads', hip, [0, -B.thigh * 0.5, B.legR * 0.72], [0.04, 0.12, 0.038])
    pad('hams', hip, [0, -B.thigh * 0.52, -B.legR * 0.72], [0.038, 0.11, 0.036])
  }
  for (const knee of [kneeL, kneeR]) {
    pad('calves', knee, [0, -B.shin * 0.42, -B.legR * 0.65], [0.033, 0.09, 0.034])
  }

  // ---- props: a barbell (two mount points) and two dumbbells ----
  function makeBar(length: number, plateR: number): THREE.Group {
    const g = new THREE.Group()
    const bar = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.014, 0.014, length, 10)),
      steel,
    )
    bar.rotation.z = Math.PI / 2
    g.add(bar)
    for (const side of [-1, 1]) {
      for (const [off, r] of [
        [0, plateR],
        [0.035, plateR * 0.72],
      ] as const) {
        const plate = new THREE.Mesh(
          track(new THREE.CylinderGeometry(r, r, 0.028, 20)),
          iron,
        )
        plate.rotation.z = Math.PI / 2
        plate.position.x = side * (length / 2 - 0.06 - off)
        g.add(plate)
      }
    }
    return g
  }

  // racked across the back of the shoulders
  const barBack = makeBar(1.5, 0.16)
  barBack.position.set(0, B.torsoUp + 0.045, -0.09)
  spine.add(barBack)
  // held in the hands (parented to the right hand; with symmetric arm
  // poses the bar stays level and centered)
  const barHands = makeBar(1.5, 0.16)
  barHands.position.set(-B.shoulderW, -B.foreArm - 0.02, 0)
  elbowR.add(barHands)
  // dumbbells
  const dbL = makeBar(0.3, 0.068)
  dbL.position.y = -B.foreArm - 0.02
  elbowL.add(dbL)
  const dbR = makeBar(0.3, 0.068)
  dbR.position.y = -B.foreArm - 0.02
  elbowR.add(dbR)

  const rig: Rig = {
    root,
    spine,
    shoulderL,
    shoulderR,
    elbowL,
    elbowR,
    hipL,
    hipR,
    kneeL,
    kneeR,
    ankleL,
    ankleR,
    dims: {
      thigh: B.thigh,
      shin: B.shin,
      foot: B.foot,
      upperArm: B.upperArm,
      foreArm: B.foreArm,
    },
  }

  return {
    rig,
    padMats,
    padAnchors,
    props: { barBack, barHands, dbL, dbR },
    dispose() {
      disposables.forEach((d) => d.dispose())
    },
  }
}

/** Neutral stance — every pose() starts from this. */
export function resetPose(rig: Rig) {
  const { foot, thigh, shin } = rig.dims
  rig.root.position.set(0, foot + thigh + shin, 0)
  rig.root.rotation.set(0, 0, 0)
  rig.spine.rotation.set(0, 0, 0)
  for (const s of ['L', 'R'] as const) {
    rig[`shoulder${s}`].rotation.set(0, 0, 0)
    rig[`elbow${s}`].rotation.set(0, 0, 0)
    rig[`hip${s}`].rotation.set(0, 0, 0)
    rig[`knee${s}`].rotation.set(0, 0, 0)
    rig[`ankle${s}`].rotation.set(0, 0, 0)
  }
}
