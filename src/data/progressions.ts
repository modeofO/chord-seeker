import type { ChordProgression } from '../types/progression'

export const PROGRESSIONS: Record<string, ChordProgression> = {
  // Major key progressions
  classic145: {
    id: 'classic145',
    name: 'I-IV-V',
    description: 'Classic rock and blues progression',
    genre: 'Rock/Blues',
    chords: [
      { degree: 'I', quality: 'major', scaleDegreeOffset: 0 },
      { degree: 'IV', quality: 'major', scaleDegreeOffset: 5 },
      { degree: 'V', quality: 'major', scaleDegreeOffset: 7 }
    ]
  },
  pop6415: {
    id: 'pop6415',
    name: 'vi-IV-I-V',
    description: 'Popular in modern pop (Axis of Awesome)',
    genre: 'Pop',
    chords: [
      { degree: 'vi', quality: 'minor', scaleDegreeOffset: 9 },
      { degree: 'IV', quality: 'major', scaleDegreeOffset: 5 },
      { degree: 'I', quality: 'major', scaleDegreeOffset: 0 },
      { degree: 'V', quality: 'major', scaleDegreeOffset: 7 }
    ]
  },
  fifties1564: {
    id: 'fifties1564',
    name: 'I-V-vi-IV',
    description: '50s progression, used in countless hits',
    genre: 'Classic',
    chords: [
      { degree: 'I', quality: 'major', scaleDegreeOffset: 0 },
      { degree: 'V', quality: 'major', scaleDegreeOffset: 7 },
      { degree: 'vi', quality: 'minor', scaleDegreeOffset: 9 },
      { degree: 'IV', quality: 'major', scaleDegreeOffset: 5 }
    ]
  },
  jazz2515: {
    id: 'jazz2515',
    name: 'ii-V-I',
    description: 'Essential jazz progression',
    genre: 'Jazz',
    chords: [
      { degree: 'ii', quality: 'minor7', scaleDegreeOffset: 2 },
      { degree: 'V7', quality: 'dominant7', scaleDegreeOffset: 7 },
      { degree: 'Imaj7', quality: 'major7', scaleDegreeOffset: 0 }
    ]
  },
  bluesy1514: {
    id: 'bluesy1514',
    name: 'I-V-I-IV',
    description: 'Blues turnaround variation',
    genre: 'Blues',
    chords: [
      { degree: 'I7', quality: 'dominant7', scaleDegreeOffset: 0 },
      { degree: 'V7', quality: 'dominant7', scaleDegreeOffset: 7 },
      { degree: 'I7', quality: 'dominant7', scaleDegreeOffset: 0 },
      { degree: 'IV7', quality: 'dominant7', scaleDegreeOffset: 5 }
    ]
  },

  // Minor key progressions
  minor1645: {
    id: 'minor1645',
    name: 'i-VI-IV-V',
    description: 'Dramatic minor progression',
    genre: 'Rock',
    chords: [
      { degree: 'i', quality: 'minor', scaleDegreeOffset: 0 },
      { degree: 'VI', quality: 'major', scaleDegreeOffset: 8 },
      { degree: 'IV', quality: 'major', scaleDegreeOffset: 5 },
      { degree: 'V', quality: 'major', scaleDegreeOffset: 7 }
    ]
  },
  minor1467: {
    id: 'minor1467',
    name: 'i-IV-VI-VII',
    description: 'Dark, descending minor progression',
    genre: 'Rock/Metal',
    chords: [
      { degree: 'i', quality: 'minor', scaleDegreeOffset: 0 },
      { degree: 'IV', quality: 'minor', scaleDegreeOffset: 5 },
      { degree: 'VI', quality: 'major', scaleDegreeOffset: 8 },
      { degree: 'VII', quality: 'major', scaleDegreeOffset: 10 }
    ]
  },
  minor1743: {
    id: 'minor1743',
    name: 'i-VII-IV-III',
    description: 'Andalusian cadence',
    genre: 'Flamenco/Rock',
    chords: [
      { degree: 'i', quality: 'minor', scaleDegreeOffset: 0 },
      { degree: 'VII', quality: 'major', scaleDegreeOffset: 10 },
      { degree: 'VI', quality: 'major', scaleDegreeOffset: 8 },
      { degree: 'V', quality: 'major', scaleDegreeOffset: 7 }
    ]
  },
  minor1674: {
    id: 'minor1674',
    name: 'i-VI-VII-IV',
    description: 'Modal minor progression',
    genre: 'Rock',
    chords: [
      { degree: 'i', quality: 'minor', scaleDegreeOffset: 0 },
      { degree: 'VI', quality: 'major', scaleDegreeOffset: 8 },
      { degree: 'VII', quality: 'major', scaleDegreeOffset: 10 },
      { degree: 'IV', quality: 'major', scaleDegreeOffset: 5 }
    ]
  },
  jazzMinor: {
    id: 'jazzMinor',
    name: 'ii-V-i',
    description: 'Minor jazz progression',
    genre: 'Jazz',
    chords: [
      { degree: 'ii°', quality: 'diminished', scaleDegreeOffset: 2 },
      { degree: 'V7', quality: 'dominant7', scaleDegreeOffset: 7 },
      { degree: 'im7', quality: 'minor7', scaleDegreeOffset: 0 }
    ]
  }
}

export const PROGRESSION_LIST = Object.values(PROGRESSIONS)

/**
 * Get progressions that work well with a given quality
 */
export function getProgressionsForQuality(quality: string): ChordProgression[] {
  const isMajorFamily = ['major', 'major7', 'dominant7', 'add9', 'augmented'].includes(quality)

  return PROGRESSION_LIST.filter((prog) => {
    const firstChord = prog.chords[0]
    const isProgressionMajor = ['major', 'major7', 'dominant7'].includes(firstChord.quality)

    // Match major progressions with major qualities and minor with minor
    return isMajorFamily ? isProgressionMajor : !isProgressionMajor
  })
}
