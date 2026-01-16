import type { ChordQuality, GuitarString, IntervalSymbol, NoteId } from '../types/music'
import type { ChordProgression } from '../types/progression'
import type { ChordRiff, ProgressionRiff, RiffNote, RiffStyle, Technique } from '../types/songBuilder'
import { GUITAR_STRINGS, INDEX_TO_NOTE, NOTE_TO_INDEX, STRING_TUNINGS } from '../data/notes'
import { SCALES } from '../data/scales'
import { QUALITY_MAP } from '../data/chordQualities'
import { transposeProgression, calculateNoteFromInterval, getBestScaleForChord } from './scaleUtils'

// Rhythmic patterns for different styles (values are beat positions)
const MELODIC_PATTERNS = [
  [0, 1, 2, 3], // Quarter notes
  [0, 0.5, 1, 2, 2.5, 3], // Mix of eighths and quarters
  [0, 1, 1.5, 2, 3, 3.5], // Syncopated
  [0, 0.5, 1, 1.5, 2, 3], // Running start
]

const ARPEGGIATED_PATTERNS = [
  [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], // Straight eighths
  [0, 1, 2, 3, 2, 1], // Up and down
  [0, 0.5, 1, 2, 2.5, 3], // Triplet feel
]

const BASS_PATTERNS = [
  [0, 2], // Half notes on root
  [0, 1, 2, 3], // Walking bass
  [0, 0.5, 2, 2.5], // Pumping eighths
  [0, 2, 2.5, 3], // Root with fills
]

// Complex patterns with sixteenth notes and syncopation
const COMPLEX_PATTERNS = [
  [0, 0.25, 0.5, 1, 1.5, 2, 2.25, 2.5, 3, 3.5], // Fast melodic run
  [0, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.25, 3.5], // Syncopated sixteenths
  [0, 0.25, 0.5, 1, 1.25, 2, 2.5, 2.75, 3, 3.5], // Mixed rhythms
  [0, 0.5, 1, 1.25, 1.5, 2, 2.25, 2.75, 3, 3.5], // Triplet feel with techniques
]

// Technique probability distribution for complex style
const TECHNIQUE_WEIGHTS: { technique: Technique; weight: number }[] = [
  { technique: 'normal', weight: 35 },
  { technique: 'hammer-on', weight: 15 },
  { technique: 'pull-off', weight: 15 },
  { technique: 'slide-up', weight: 10 },
  { technique: 'slide-down', weight: 8 },
  { technique: 'bend', weight: 7 },
  { technique: 'harmonic', weight: 5 },
  { technique: 'muted', weight: 5 },
]

/**
 * Select a random technique based on weights
 */
function selectTechnique(prevNote?: RiffNote): Technique {
  const totalWeight = TECHNIQUE_WEIGHTS.reduce((sum, t) => sum + t.weight, 0)
  let random = Math.random() * totalWeight

  // Bias towards legato techniques if previous note exists on same string
  if (prevNote) {
    // More likely to do hammer-on if going up, pull-off if going down
    random = Math.random() * totalWeight * 0.8 // Increase technique variety
  }

  for (const { technique, weight } of TECHNIQUE_WEIGHTS) {
    random -= weight
    if (random <= 0) return technique
  }
  return 'normal'
}

/**
 * Get natural harmonic frets
 */
const HARMONIC_FRETS = [5, 7, 12] // Natural harmonic positions

/**
 * Find ALL playable positions for a note on given strings within fret range
 */
function findAllNotePositions(
  targetNote: NoteId,
  preferredStrings: GuitarString[],
  fretRange: { min: number; max: number }
): Array<{ string: GuitarString; fret: number }> {
  const targetIndex = NOTE_TO_INDEX[targetNote]
  const positions: Array<{ string: GuitarString; fret: number }> = []

  for (const stringId of preferredStrings) {
    const tuning = STRING_TUNINGS[stringId]
    for (let fret = fretRange.min; fret <= fretRange.max; fret++) {
      const noteIndex = (tuning.index + fret) % 12
      if (noteIndex === targetIndex) {
        positions.push({ string: stringId, fret })
      }
    }
  }

  return positions
}

/**
 * Find playable position for a note on preferred strings within fret range
 * Now with better string distribution - considers previous note for variety
 */
export function findNotePosition(
  targetNote: NoteId,
  preferredStrings: GuitarString[],
  fretRange: { min: number; max: number },
  prevPosition?: { string: GuitarString; fret: number }
): { string: GuitarString; fret: number } | null {
  // Find all possible positions
  let positions = findAllNotePositions(targetNote, preferredStrings, fretRange)

  // If no positions on preferred strings, try all strings
  if (positions.length === 0) {
    positions = findAllNotePositions(targetNote, GUITAR_STRINGS, fretRange)
  }

  if (positions.length === 0) return null

  // If only one position, return it
  if (positions.length === 1) return positions[0]

  // Multiple positions available - choose based on context
  if (prevPosition) {
    // Prefer positions that encourage string crossing for variety
    // Sort by: different string preferred, then by fret proximity
    positions.sort((a, b) => {
      const aIsSameString = a.string === prevPosition.string ? 1 : 0
      const bIsSameString = b.string === prevPosition.string ? 1 : 0

      // First prioritize different strings (70% of the time)
      if (aIsSameString !== bIsSameString && Math.random() < 0.7) {
        return aIsSameString - bIsSameString
      }

      // Then prefer closer frets for playability
      const aFretDist = Math.abs(a.fret - prevPosition.fret)
      const bFretDist = Math.abs(b.fret - prevPosition.fret)
      return aFretDist - bFretDist
    })

    // Add some randomness - pick from top 2 choices
    const topChoices = positions.slice(0, Math.min(2, positions.length))
    return topChoices[Math.floor(Math.random() * topChoices.length)]
  }

  // No previous position - pick randomly from positions
  return positions[Math.floor(Math.random() * positions.length)]
}

/**
 * Get chord tones for a given root and quality
 */
function getChordTones(root: NoteId, quality: ChordQuality): NoteId[] {
  const qualityDef = QUALITY_MAP[quality]
  if (!qualityDef) return [root]

  return qualityDef.intervals.map((interval) => calculateNoteFromInterval(root, interval))
}

/**
 * Get scale notes for a chord
 */
function getScaleNotes(root: NoteId, quality: ChordQuality): NoteId[] {
  const scaleList = Object.values(SCALES)
  const scale = getBestScaleForChord(quality, scaleList)

  if (!scale) {
    // Fallback to chord tones
    return getChordTones(root, quality)
  }

  return scale.intervals.map((interval) => calculateNoteFromInterval(root, interval))
}

/**
 * Generate a riff for a single chord
 */
export function generateChordRiff(
  chordRoot: NoteId,
  chordQuality: ChordQuality,
  chordDegree: string,
  nextChordRoot: NoteId | null,
  style: RiffStyle,
  beatsPerChord: number = 4
): ChordRiff {
  const chordTones = getChordTones(chordRoot, chordQuality)
  const scaleTones = getScaleNotes(chordRoot, chordQuality)
  const notes: RiffNote[] = []

  // Select pattern and strings based on style
  let pattern: number[]
  let preferredStrings: GuitarString[]
  let fretRange: { min: number; max: number }
  let useComplexTechniques = false

  switch (style) {
    case 'melodic':
      pattern = MELODIC_PATTERNS[Math.floor(Math.random() * MELODIC_PATTERNS.length)]
      preferredStrings = [1, 2, 3, 4] // High to mid strings for melody
      fretRange = { min: 0, max: 12 }
      break
    case 'arpeggiated':
      pattern = ARPEGGIATED_PATTERNS[Math.floor(Math.random() * ARPEGGIATED_PATTERNS.length)]
      preferredStrings = [1, 2, 3, 4, 5] // Wide range for arpeggios
      fretRange = { min: 0, max: 9 }
      break
    case 'bass-driven':
      pattern = BASS_PATTERNS[Math.floor(Math.random() * BASS_PATTERNS.length)]
      preferredStrings = [6, 5, 4] // Low strings
      fretRange = { min: 0, max: 5 }
      break
    case 'complex':
      pattern = COMPLEX_PATTERNS[Math.floor(Math.random() * COMPLEX_PATTERNS.length)]
      preferredStrings = [1, 2, 3, 4, 5, 6] // All strings for maximum variety
      fretRange = { min: 0, max: 15 }
      useComplexTechniques = true
      break
  }

  // Generate notes for each beat in the pattern
  pattern.forEach((beatPosition, index) => {
    if (beatPosition >= beatsPerChord) return

    let targetNote: NoteId
    let interval: IntervalSymbol | undefined

    // Determine which note to use based on position
    const isStrongBeat = beatPosition === 0 || beatPosition === 2
    const isLastBeat = beatPosition >= 3

    if (style === 'complex') {
      // Complex style: mix of chord tones, scale runs, and chromatic approaches
      const useChordTone = Math.random() < 0.4 || isStrongBeat
      if (useChordTone) {
        const toneIndex = Math.floor(Math.random() * chordTones.length)
        targetNote = chordTones[toneIndex]
        interval = QUALITY_MAP[chordQuality]?.intervals[toneIndex]
      } else if (isLastBeat && nextChordRoot) {
        // Chromatic approach to next chord
        const nextRootIndex = NOTE_TO_INDEX[nextChordRoot]
        const approachIndex = (nextRootIndex + (Math.random() < 0.5 ? -1 : 1) + 12) % 12
        targetNote = INDEX_TO_NOTE[approachIndex]
      } else {
        // Scale runs with occasional chromaticism
        const addChromatic = Math.random() < 0.15
        if (addChromatic) {
          const randomIndex = Math.floor(Math.random() * 12)
          targetNote = INDEX_TO_NOTE[randomIndex]
        } else {
          const toneIndex = Math.floor(Math.random() * scaleTones.length)
          targetNote = scaleTones[toneIndex]
        }
      }
    } else if (style === 'arpeggiated') {
      // Cycle through chord tones
      const toneIndex = index % chordTones.length
      targetNote = chordTones[toneIndex]
      interval = QUALITY_MAP[chordQuality]?.intervals[toneIndex]
    } else if (style === 'bass-driven') {
      // Mostly root with occasional fifth
      if (isStrongBeat) {
        targetNote = chordRoot
        interval = 'R'
      } else {
        // Use fifth or other chord tone
        targetNote = chordTones.length > 2 ? chordTones[2] : chordTones[0]
        interval = '5'
      }
    } else {
      // Melodic style
      if (isStrongBeat) {
        // Use chord tones on strong beats
        const toneIndex = Math.floor(Math.random() * chordTones.length)
        targetNote = chordTones[toneIndex]
        interval = QUALITY_MAP[chordQuality]?.intervals[toneIndex]
      } else if (isLastBeat && nextChordRoot) {
        // Approach note to next chord
        const nextRootIndex = NOTE_TO_INDEX[nextChordRoot]
        const approachIndex = (nextRootIndex - 1 + 12) % 12
        targetNote = INDEX_TO_NOTE[approachIndex]
      } else {
        // Use scale tones
        const toneIndex = Math.floor(Math.random() * scaleTones.length)
        targetNote = scaleTones[toneIndex]
      }
    }

    // Get previous note for context-aware positioning
    const prevNote = notes.length > 0 ? notes[notes.length - 1] : undefined
    const prevPosition = prevNote ? { string: prevNote.string, fret: prevNote.fret } : undefined

    // Find position on fretboard - pass previous position for better string distribution
    const position = findNotePosition(targetNote, preferredStrings, fretRange, prevPosition)
    if (position) {
      const duration = index < pattern.length - 1 ? pattern[index + 1] - beatPosition : beatsPerChord - beatPosition

      // Determine technique for complex style
      let technique: Technique | undefined
      let targetFret: number | undefined

      if (useComplexTechniques) {
        const selectedTechnique = selectTechnique(prevNote)

        // Adjust technique based on context
        if (selectedTechnique === 'harmonic') {
          // Only use harmonics on valid frets
          const harmonicFret = HARMONIC_FRETS.find(f => f >= fretRange.min && f <= fretRange.max)
          if (harmonicFret !== undefined) {
            position.fret = harmonicFret
            technique = 'harmonic'
          }
        } else if (selectedTechnique === 'hammer-on' && prevNote && prevNote.string === position.string) {
          // Hammer-on requires being on same string and going higher
          if (position.fret > prevNote.fret) {
            technique = 'hammer-on'
          }
        } else if (selectedTechnique === 'pull-off' && prevNote && prevNote.string === position.string) {
          // Pull-off requires being on same string and going lower
          if (position.fret < prevNote.fret) {
            technique = 'pull-off'
          }
        } else if (selectedTechnique === 'slide-up') {
          // Start 2-3 frets below and slide up
          const slideAmount = Math.floor(Math.random() * 2) + 2
          if (position.fret >= slideAmount) {
            targetFret = position.fret
            position.fret = position.fret - slideAmount
            technique = 'slide-up'
          }
        } else if (selectedTechnique === 'slide-down') {
          // Slide down 2-3 frets
          const slideAmount = Math.floor(Math.random() * 2) + 2
          if (position.fret + slideAmount <= fretRange.max) {
            targetFret = position.fret + slideAmount
            technique = 'slide-down'
          }
        } else if (selectedTechnique === 'bend') {
          // Bend works best on strings 1-4, frets 5+
          if (position.string <= 4 && position.fret >= 5) {
            technique = 'bend'
            targetFret = position.fret + (Math.random() < 0.5 ? 1 : 2) // Half or whole step bend
          }
        } else if (selectedTechnique === 'muted') {
          technique = 'muted'
        }
      }

      notes.push({
        id: `${chordDegree}-${index}`,
        string: position.string,
        fret: position.fret,
        duration: Math.min(duration, 1),
        startBeat: beatPosition,
        note: targetNote,
        interval,
        technique,
        targetFret
      })
    }
  })

  return {
    chordRoot,
    chordQuality,
    chordDegree,
    notes,
    totalBeats: beatsPerChord
  }
}

/**
 * Generate a full riff for an entire chord progression
 */
export function generateProgressionRiff(
  progression: ChordProgression,
  rootNote: NoteId,
  style: RiffStyle,
  bpm: number
): ProgressionRiff {
  const transposed = transposeProgression(progression, rootNote)
  const chordRiffs: ChordRiff[] = []

  transposed.forEach((chord, index) => {
    const nextChord = transposed[index + 1] || transposed[0] // Loop back for approach notes
    const riff = generateChordRiff(
      chord.note,
      chord.quality,
      chord.degree,
      nextChord.note,
      style
    )
    chordRiffs.push(riff)
  })

  return {
    id: `riff-${Date.now()}`,
    chordRiffs,
    bpm,
    style
  }
}

/**
 * Get available notes at a position for editing
 */
export function getAvailableNotesAtPosition(
  chordRoot: NoteId,
  chordQuality: ChordQuality,
  stringId: GuitarString,
  fretRange: { min: number; max: number } = { min: 0, max: 12 }
): Array<{ note: NoteId; fret: number; interval?: IntervalSymbol }> {
  const scaleTones = getScaleNotes(chordRoot, chordQuality)
  const chordTones = getChordTones(chordRoot, chordQuality)
  const qualityDef = QUALITY_MAP[chordQuality]
  const tuning = STRING_TUNINGS[stringId]
  const available: Array<{ note: NoteId; fret: number; interval?: IntervalSymbol }> = []

  for (let fret = fretRange.min; fret <= fretRange.max; fret++) {
    const noteIndex = (tuning.index + fret) % 12
    const note = INDEX_TO_NOTE[noteIndex]

    if (scaleTones.includes(note)) {
      // Find interval if it's a chord tone
      const chordToneIndex = chordTones.indexOf(note)
      const interval = chordToneIndex >= 0 ? qualityDef?.intervals[chordToneIndex] : undefined

      available.push({ note, fret, interval })
    }
  }

  return available
}

/**
 * Update a single note in a riff
 */
export function updateRiffNote(
  riff: ProgressionRiff,
  measureIndex: number,
  noteId: string,
  newString: GuitarString,
  newFret: number,
  newNote: NoteId
): ProgressionRiff {
  const newChordRiffs = [...riff.chordRiffs]
  const chordRiff = { ...newChordRiffs[measureIndex] }

  chordRiff.notes = chordRiff.notes.map((note) => {
    if (note.id === noteId) {
      return { ...note, string: newString, fret: newFret, note: newNote }
    }
    return note
  })

  newChordRiffs[measureIndex] = chordRiff

  return { ...riff, chordRiffs: newChordRiffs }
}

/**
 * Add a note to a riff at a specific position
 */
export function addRiffNote(
  riff: ProgressionRiff,
  measureIndex: number,
  stringId: GuitarString,
  fret: number,
  startBeat: number,
  note: NoteId
): ProgressionRiff {
  const newChordRiffs = [...riff.chordRiffs]
  const chordRiff = { ...newChordRiffs[measureIndex] }

  const newNote: RiffNote = {
    id: `${chordRiff.chordDegree}-${Date.now()}`,
    string: stringId,
    fret,
    duration: 0.5,
    startBeat,
    note
  }

  chordRiff.notes = [...chordRiff.notes, newNote].sort((a, b) => a.startBeat - b.startBeat)
  newChordRiffs[measureIndex] = chordRiff

  return { ...riff, chordRiffs: newChordRiffs }
}

/**
 * Remove a note from a riff
 */
export function removeRiffNote(
  riff: ProgressionRiff,
  measureIndex: number,
  noteId: string
): ProgressionRiff {
  const newChordRiffs = [...riff.chordRiffs]
  const chordRiff = { ...newChordRiffs[measureIndex] }

  chordRiff.notes = chordRiff.notes.filter((note) => note.id !== noteId)
  newChordRiffs[measureIndex] = chordRiff

  return { ...riff, chordRiffs: newChordRiffs }
}
