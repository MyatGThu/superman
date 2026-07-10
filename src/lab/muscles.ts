// The muscle vocabulary of the Lab. Ten major groups — enough to make
// every movement's target unmistakable on a stylized body without
// pretending to be an anatomy atlas.
export const MUSCLES = {
  pecs: 'Pectorals',
  delts: 'Deltoids',
  biceps: 'Biceps',
  triceps: 'Triceps',
  lats: 'Lats',
  core: 'Core',
  glutes: 'Glutes',
  quads: 'Quadriceps',
  hams: 'Hamstrings',
  calves: 'Calves',
} as const

export type MuscleId = keyof typeof MUSCLES

export type Sex = 'man' | 'woman'
