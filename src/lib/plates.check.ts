// Smallest runnable check for the plate-math logic:
//   npm run check   (node --experimental-strip-types)
// Fails loudly if the decomposition ever breaks.
import { platesPerSide, platesLabel } from './plates.ts'

const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

// 120 kg → 50 per side → 25+25
assert(platesPerSide(120).join(',') === '25,25', '120 kg = 25+25 per side')
// 142.5 kg → 61.25 per side → 25+25+10+1.25
assert(platesPerSide(142.5).join(',') === '25,25,10,1.25', '142.5 kg decomposition')
// bar only / invalid inputs
assert(platesPerSide(20).length === 0, 'empty bar has no plates')
assert(platesPerSide(NaN).length === 0, 'NaN is handled')
assert(platesLabel(20) === 'empty bar', 'empty-bar label')
// every result must re-sum to the target
for (let kg = 22.5; kg <= 300; kg += 2.5) {
  const sum = platesPerSide(kg).reduce((a, b) => a + b, 0)
  assert(Math.abs(sum * 2 + 20 - kg) < 1e-6, `${kg} kg re-sums exactly`)
}

console.log('plates.check: all assertions passed')
