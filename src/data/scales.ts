import type { IntervalSymbol } from '../types/music'
import type { ScaleDefinition } from '../types/progression'

export const SCALES: Record<string, ScaleDefinition> = {
  // Pentatonic scales
  minorPentatonic: {
    id: 'minorPentatonic',
    name: 'Minor Pentatonic',
    displayName: 'Minor Pentatonic',
    intervals: ['R', 'b3', '4', '5', 'b7'] as IntervalSymbol[],
    description: 'Classic blues and rock scale',
    compatibleQualities: ['minor', 'minor7']
  },
  majorPentatonic: {
    id: 'majorPentatonic',
    name: 'Major Pentatonic',
    displayName: 'Major Pentatonic',
    intervals: ['R', '2', '3', '5', '6'] as IntervalSymbol[],
    description: 'Bright, uplifting pentatonic scale',
    compatibleQualities: ['major', 'major7']
  },

  // Natural scales
  naturalMinor: {
    id: 'naturalMinor',
    name: 'Natural Minor',
    displayName: 'Natural Minor (Aeolian)',
    intervals: ['R', '2', 'b3', '4', '5', 'b6', 'b7'] as IntervalSymbol[],
    description: 'The natural minor scale',
    compatibleQualities: ['minor', 'minor7']
  },
  majorScale: {
    id: 'majorScale',
    name: 'Major Scale',
    displayName: 'Major Scale (Ionian)',
    intervals: ['R', '2', '3', '4', '5', '6', '7'] as IntervalSymbol[],
    description: 'The major scale',
    compatibleQualities: ['major', 'major7']
  },

  // Harmonic scales
  harmonicMinor: {
    id: 'harmonicMinor',
    name: 'Harmonic Minor',
    displayName: 'Harmonic Minor',
    intervals: ['R', '2', 'b3', '4', '5', 'b6', '7'] as IntervalSymbol[],
    description: 'Minor scale with raised 7th',
    compatibleQualities: ['minor', 'minor7']
  },

  // Melodic scales
  melodicMinor: {
    id: 'melodicMinor',
    name: 'Melodic Minor',
    displayName: 'Melodic Minor',
    intervals: ['R', '2', 'b3', '4', '5', '6', '7'] as IntervalSymbol[],
    description: 'Minor scale with raised 6th and 7th',
    compatibleQualities: ['minor', 'minor7']
  },

  // Modes
  dorian: {
    id: 'dorian',
    name: 'Dorian',
    displayName: 'Dorian Mode',
    intervals: ['R', '2', 'b3', '4', '5', '6', 'b7'] as IntervalSymbol[],
    description: 'Minor mode with raised 6th',
    compatibleQualities: ['minor', 'minor7']
  },
  phrygian: {
    id: 'phrygian',
    name: 'Phrygian',
    displayName: 'Phrygian Mode',
    intervals: ['R', 'b2', 'b3', '4', '5', 'b6', 'b7'] as IntervalSymbol[],
    description: 'Dark minor mode with b2',
    compatibleQualities: ['minor', 'minor7']
  },
  lydian: {
    id: 'lydian',
    name: 'Lydian',
    displayName: 'Lydian Mode',
    intervals: ['R', '2', '3', '#4', '5', '6', '7'] as IntervalSymbol[],
    description: 'Bright major mode with #4',
    compatibleQualities: ['major', 'major7']
  },
  mixolydian: {
    id: 'mixolydian',
    name: 'Mixolydian',
    displayName: 'Mixolydian Mode',
    intervals: ['R', '2', '3', '4', '5', '6', 'b7'] as IntervalSymbol[],
    description: 'Major mode with b7',
    compatibleQualities: ['major', 'dominant7']
  },
  locrian: {
    id: 'locrian',
    name: 'Locrian',
    displayName: 'Locrian Mode',
    intervals: ['R', 'b2', 'b3', '4', 'b5', 'b6', 'b7'] as IntervalSymbol[],
    description: 'Diminished mode',
    compatibleQualities: ['diminished']
  },

  // Blues
  bluesScale: {
    id: 'bluesScale',
    name: 'Blues Scale',
    displayName: 'Blues Scale',
    intervals: ['R', 'b3', '4', 'b5', '5', 'b7'] as IntervalSymbol[],
    description: 'Minor pentatonic with added b5',
    compatibleQualities: ['minor', 'minor7', 'dominant7']
  }
}

export const SCALE_LIST = Object.values(SCALES)

/**
 * Get recommended scales for a given chord quality
 */
export function getScalesForQuality(quality: string): ScaleDefinition[] {
  return SCALE_LIST.filter((scale) => scale.compatibleQualities.includes(quality as any))
}
