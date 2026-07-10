// Loads one of Melina's animated GLB clips (mesh + humanoid skeleton +
// a single baked animation) and prepares it for the stage: normalized
// to real-world height, grounded on the floor, its clip looping on an
// AnimationMixer, and per-muscle anchor points resolved to actual
// bones so labels, markers, and the camera can find her anatomy.
//
// Bone names come from the auto-rigger (Mixamo-style: Hips, Spine2,
// RightUpLeg, ...). Matching is fuzzy and every muscle falls back to a
// body-box estimate, so an unexpected skeleton degrades gracefully
// instead of crashing.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { MuscleId } from './muscles'

/** A muscle anchor: a point between two bones (t along a→b), tracked
 *  per frame in world space. b === a pins the anchor to one bone. */
interface BoneAnchor {
  a: THREE.Object3D
  b: THREE.Object3D
  t: number
}

export interface CharacterHandle {
  root: THREE.Group
  update(dt: number): void
  /** World-space position of a muscle anchor (into `out`). */
  anchorPosition(m: MuscleId, out: THREE.Vector3): THREE.Vector3
  dispose(): void
}

// muscle → [boneA pattern, boneB pattern, t]; right side chosen where
// it matters so anchors spread instead of stacking.
const BONE_MAP: Record<MuscleId, [string, string, number]> = {
  pecs: ['spine2', 'neck', 0.45],
  core: ['spine', 'spine2', 0.4],
  lats: ['spine1', 'spine2', 0.5],
  delts: ['rightshoulder', 'rightarm', 0.85],
  biceps: ['rightarm', 'rightforearm', 0.5],
  triceps: ['leftarm', 'leftforearm', 0.5],
  glutes: ['hips', 'hips', 0],
  quads: ['rightupleg', 'rightleg', 0.5],
  hams: ['leftupleg', 'leftleg', 0.55],
  calves: ['rightleg', 'rightfoot', 0.45],
}

const loader = new GLTFLoader()

export async function loadCharacterClip(
  url: string,
  height: number,
): Promise<CharacterHandle> {
  const gltf = await loader.loadAsync(url)
  const root = new THREE.Group()
  root.add(gltf.scene)

  // ---- normalize: real-world height, feet on the floor, centered ----
  const box = new THREE.Box3().setFromObject(gltf.scene)
  const size = box.getSize(new THREE.Vector3())
  const scale = height / (size.y || 1)
  gltf.scene.scale.setScalar(scale)
  box.setFromObject(gltf.scene)
  const center = box.getCenter(new THREE.Vector3())
  gltf.scene.position.x -= center.x
  gltf.scene.position.z -= center.z
  gltf.scene.position.y -= box.min.y

  // ---- animation: play the baked clip, looping ----
  let mixer: THREE.AnimationMixer | null = null
  if (gltf.animations.length) {
    mixer = new THREE.AnimationMixer(gltf.scene)
    mixer.clipAction(gltf.animations[0]).play()
  }

  // ---- bone anchors ----
  const bones = new Map<string, THREE.Object3D>()
  gltf.scene.traverse((o) => {
    if ((o as THREE.Bone).isBone) {
      // strip rig prefixes ("mixamorig:RightArm" → "rightarm")
      bones.set(o.name.toLowerCase().replace(/^.*[:_]/, '').replace(/[^a-z0-9]/g, ''), o)
    }
  })
  const findBone = (pattern: string): THREE.Object3D | undefined => {
    if (bones.has(pattern)) return bones.get(pattern)
    for (const [name, bone] of bones) if (name.includes(pattern)) return bone
    return undefined
  }

  const anchors = new Map<MuscleId, BoneAnchor>()
  for (const [muscle, [pa, pb, t]] of Object.entries(BONE_MAP) as [
    MuscleId,
    [string, string, number],
  ][]) {
    const a = findBone(pa)
    const b = findBone(pb) ?? a
    if (a && b) anchors.set(muscle, { a, b, t })
  }

  // Fallback anchors when the skeleton is unrecognizable: fixed
  // fractions of the body box (better a rough label than none).
  const FALLBACK_Y: Record<MuscleId, number> = {
    pecs: 0.72,
    core: 0.58,
    lats: 0.65,
    delts: 0.8,
    biceps: 0.68,
    triceps: 0.68,
    glutes: 0.5,
    quads: 0.38,
    hams: 0.36,
    calves: 0.16,
  }

  const va = new THREE.Vector3()
  const vb = new THREE.Vector3()

  return {
    root,
    update(dt) {
      mixer?.update(dt)
    },
    anchorPosition(m, out) {
      const anchor = anchors.get(m)
      if (anchor) {
        anchor.a.getWorldPosition(va)
        anchor.b.getWorldPosition(vb)
        return out.copy(va).lerp(vb, anchor.t)
      }
      return out.set(0, FALLBACK_Y[m] * height, 0)
    },
    dispose() {
      mixer?.stopAllAction()
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry.dispose()
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((mat) => {
            const m = mat as THREE.MeshStandardMaterial
            m.map?.dispose()
            m.normalMap?.dispose()
            m.metalnessMap?.dispose()
            m.roughnessMap?.dispose()
            m.dispose()
          })
        }
      })
    },
  }
}
