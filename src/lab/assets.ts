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
  /** exercise id → animated GLB (mesh + skeleton + one clip).
   *  Wardrobe: burnt-orange sports bra, charcoal seamless leggings —
   *  the FURNACE palette, baked into the scan's texture. */
  clips: {
    'air-squat':
      'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/67e36bda-53b0-4cc0-9693-4c512aa148b7.glb',
    'push-up':
      'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/d6a340ab-5b0a-431e-8a84-e4d284e9693e.glb',
    curl: 'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/2b46277e-c155-4744-bb7d-95033912d30c.glb',
    'kb-swing':
      'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/830056a4-2544-41dd-a055-1d26197d2901.glb',
  } as Record<string, string>,
}
