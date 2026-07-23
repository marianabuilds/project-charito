import { describe, expect, it } from 'vitest'
import {
  CULTURE_CONFIGS,
  SUPPORTED_CULTURES,
  getPhrasesForCultureAndMode,
} from './presets'

describe('cultural presets', () => {
  it('only exposes Peru, Mexico, and United States', () => {
    const ids = SUPPORTED_CULTURES.map((c) => c.id).sort()
    expect(ids).toEqual(['mx', 'pe', 'us'])
  })

  it('includes the required Peruvian phrase text', () => {
    const peruvianStrict = getPhrasesForCultureAndMode('pe', 'strict')
    const match = peruvianStrict.find((p) =>
      p.text.includes('Oye compadre, ya basta con el celular'),
    )
    expect(match).toBeDefined()
  })

  it('has at least one gentle and one strict phrase per culture', () => {
    for (const culture of SUPPORTED_CULTURES) {
      const gentle = getPhrasesForCultureAndMode(culture.id, 'gentle')
      const strict = getPhrasesForCultureAndMode(culture.id, 'strict')
      expect(gentle.length).toBeGreaterThanOrEqual(1)
      expect(strict.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('shares the same references between CULTURE_CONFIGS and SUPPORTED_CULTURES', () => {
    for (const culture of SUPPORTED_CULTURES) {
      expect(CULTURE_CONFIGS[culture.id]).toBeDefined()
      expect(CULTURE_CONFIGS[culture.id].id).toBe(culture.id)
    }
  })
})

