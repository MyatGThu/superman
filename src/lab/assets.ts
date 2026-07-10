// Melina Jones Voss — generated character assets (Higgsfield Soul 2 →
// Meshy image-to-3D → rigged + animated GLBs). URLs point at the
// generation CDN and are hotlinked: the client fetches them directly.
// If any asset fails to load (offline, CORS, CDN gone), the Lab falls
// back to the procedural mannequin automatically — the section never
// breaks. To self-host instead, download each GLB into public/models/
// and change these URLs to 'models/<file>.glb'.
//
// Filled in by the generation pipeline; see README "The Lab".
export const MELINA = {
  name: 'Melina Jones Voss',
  /** Approximate character height after normalization, meters. */
  height: 1.66,
  /** exercise id → animated GLB (mesh + skeleton + one clip) */
  clips: {
    'air-squat':
      'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/6332283b-8dea-41a6-bd6b-c248fd06aa3a.glb',
    'push-up':
      'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/e78a73d7-08dd-4ea1-8e5c-24c88d331455.glb',
    curl: 'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/375e4c6b-fe9f-4499-8ac1-b7fd127281e6.glb',
    'kb-swing':
      'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/e980fc87-0e56-452c-a8ff-c034ff936bf1.glb',
    'sumo-pull':
      'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/77aa0550-5403-4d1b-bb4d-db40f90fea06.glb',
    situp:
      'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/7f959e28-88c0-4a00-9c33-a4949d45be33.glb',
  } as Record<string, string>,
}
