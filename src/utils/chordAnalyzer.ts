import type { NoteId } from '../types/music'
import type { ChordAnalysisResult, ChordInterpretation } from '../types/analyzer'
import { NOTE_TO_INDEX } from '../data/notes'

// Chord formulas as semitone intervals from root
const CHORD_FORMULAS: Record<string, { intervals: number[]; quality: string; fullName: string }> = {
  // Triads
  major: { intervals: [0, 4, 7], quality: 'major', fullName: 'Major' },
  minor: { intervals: [0, 3, 7], quality: 'minor', fullName: 'minor' },
  diminished: { intervals: [0, 3, 6], quality: 'dim', fullName: 'Diminished' },
  augmented: { intervals: [0, 4, 8], quality: 'aug', fullName: 'Augmented' },
  sus2: { intervals: [0, 2, 7], quality: 'sus2', fullName: 'Suspended 2nd' },
  sus4: { intervals: [0, 5, 7], quality: 'sus4', fullName: 'Suspended 4th' },

  // Seventh chords
  major7: { intervals: [0, 4, 7, 11], quality: 'maj7', fullName: 'Major 7th' },
  minor7: { intervals: [0, 3, 7, 10], quality: 'm7', fullName: 'Minor 7th' },
  dominant7: { intervals: [0, 4, 7, 10], quality: '7', fullName: 'Dominant 7th' },
  diminished7: { intervals: [0, 3, 6, 9], quality: 'dim7', fullName: 'Diminished 7th' },
  halfDiminished7: { intervals: [0, 3, 6, 10], quality: 'm7b5', fullName: 'Half-Diminished 7th' },
  minorMajor7: { intervals: [0, 3, 7, 11], quality: 'mMaj7', fullName: 'Minor Major 7th' },
  augmented7: { intervals: [0, 4, 8, 10], quality: 'aug7', fullName: 'Augmented 7th' },

  // Extended chords
  major6: { intervals: [0, 4, 7, 9], quality: '6', fullName: 'Major 6th' },
  minor6: { intervals: [0, 3, 7, 9], quality: 'm6', fullName: 'Minor 6th' },
  add9: { intervals: [0, 4, 7, 14], quality: 'add9', fullName: 'Add 9' },
  major9: { intervals: [0, 4, 7, 11, 14], quality: 'maj9', fullName: 'Major 9th' },
  minor9: { intervals: [0, 3, 7, 10, 14], quality: 'm9', fullName: 'Minor 9th' },
  dominant9: { intervals: [0, 4, 7, 10, 14], quality: '9', fullName: 'Dominant 9th' },

  // Power chord
  power: { intervals: [0, 7], quality: '5', fullName: 'Power Chord' }
}

/**
 * Convert note names to semitone indices (normalized to 0-11)
 */
function noteToSemitone(note: NoteId): number {
  return NOTE_TO_INDEX[note]
}

/**
 * Get unique notes from an array, preserving order
 */
function getUniqueNotes(notes: NoteId[]): NoteId[] {
  const seen = new Set<NoteId>()
  return notes.filter((note) => {
    if (seen.has(note)) return false
    seen.add(note)
    return true
  })
}

/**
 * Calculate intervals from a root note to all other notes in the set
 */
function calculateIntervals(rootNote: NoteId, notes: NoteId[]): number[] {
  const rootSemitone = noteToSemitone(rootNote)
  return notes.map((note) => {
    const noteSemitone = noteToSemitone(note)
    let interval = noteSemitone - rootSemitone
    if (interval < 0) interval += 12
    return interval
  }).sort((a, b) => a - b)
}

/**
 * Check if an interval set matches a chord formula
 */
function matchesFormula(intervals: number[], formula: number[]): boolean {
  if (intervals.length < formula.length) return false

  // Normalize intervals to within one octave
  const normalizedIntervals = intervals.map(i => i % 12).sort((a, b) => a - b)
  const uniqueIntervals = Array.from(new Set(normalizedIntervals))

  // Check if all formula intervals are present
  return formula.every(f => uniqueIntervals.includes(f))
}

/**
 * Calculate confidence score based on how well the notes match
 */
function calculateConfidence(intervals: number[], formula: number[]): number {
  const normalizedIntervals = Array.from(new Set(intervals.map(i => i % 12)))

  // Perfect match
  if (normalizedIntervals.length === formula.length && matchesFormula(intervals, formula)) {
    return 100
  }

  // Has extra notes
  if (normalizedIntervals.length > formula.length && matchesFormula(intervals, formula)) {
    return 80
  }

  // Partial match
  const matchCount = formula.filter(f => normalizedIntervals.includes(f)).length
  return Math.round((matchCount / formula.length) * 70)
}

/**
 * Determine if the chord is in an inversion
 */
function detectInversion(intervals: number[], formula: number[], bassNote: NoteId, root: NoteId): string | undefined {
  if (bassNote === root) return undefined

  const normalizedIntervals = intervals.map(i => i % 12)
  const bassInterval = normalizedIntervals[0]

  // First inversion - third in bass
  if (formula.includes(3) && bassInterval === 3) return '1st inversion'
  if (formula.includes(4) && bassInterval === 4) return '1st inversion'

  // Second inversion - fifth in bass
  if (formula.includes(7) && bassInterval === 7) return '2nd inversion'

  // Third inversion - seventh in bass (for 7th chords)
  if (formula.includes(10) && bassInterval === 10) return '3rd inversion'
  if (formula.includes(11) && bassInterval === 11) return '3rd inversion'

  return 'slash chord'
}

/**
 * Get interval names for display
 */
function getIntervalNames(intervals: number[]): string[] {
  const intervalMap: Record<number, string> = {
    0: 'R', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: 'b5/#4',
    7: '5', 8: '#5/b6', 9: '6', 10: 'b7', 11: '7', 14: '9'
  }

  return intervals.map(i => intervalMap[i % 12] || `+${i}`)
}

/**
 * Main chord analysis function
 */
export function analyzeChord(notes: NoteId[]): ChordAnalysisResult {
  const uniqueNotes = getUniqueNotes(notes)
  const noteCount = uniqueNotes.length

  if (noteCount === 0) {
    return {
      possibleChords: [],
      selectedNotes: notes,
      uniqueNotes: [],
      noteCount: 0
    }
  }

  if (noteCount === 1) {
    return {
      possibleChords: [{
        root: uniqueNotes[0],
        quality: '',
        fullName: `${uniqueNotes[0]} (single note)`,
        intervals: ['R'],
        confidence: 100
      }],
      selectedNotes: notes,
      uniqueNotes,
      noteCount
    }
  }

  const interpretations: ChordInterpretation[] = []

  // Try each unique note as a potential root
  for (const potentialRoot of uniqueNotes) {
    const intervals = calculateIntervals(potentialRoot, uniqueNotes)

    // Try to match against each chord formula
    for (const [, formulaData] of Object.entries(CHORD_FORMULAS)) {
      if (matchesFormula(intervals, formulaData.intervals)) {
        const confidence = calculateConfidence(intervals, formulaData.intervals)

        if (confidence >= 60) {
          const bassNote = notes[0] // First note in the voicing
          const inversion = detectInversion(intervals, formulaData.intervals, bassNote, potentialRoot)
          const intervalNames = getIntervalNames(intervals)

          let fullName = `${potentialRoot}${formulaData.quality}`
          let explanation = formulaData.fullName

          if (inversion) {
            fullName += ` (${inversion})`
            if (inversion === 'slash chord') {
              fullName = `${potentialRoot}${formulaData.quality}/${bassNote}`
              explanation += ` with ${bassNote} in bass`
            } else {
              explanation += ` - ${inversion}`
            }
          }

          interpretations.push({
            root: potentialRoot,
            quality: formulaData.quality,
            fullName,
            intervals: intervalNames,
            confidence,
            inversion,
            bassNote: bassNote !== potentialRoot ? bassNote : undefined,
            explanation
          })
        }
      }
    }
  }

  // Sort by confidence (highest first)
  interpretations.sort((a, b) => b.confidence - a.confidence)

  // If no matches found, return a generic description
  if (interpretations.length === 0) {
    const firstNote = uniqueNotes[0]
    const intervals = calculateIntervals(firstNote, uniqueNotes)
    interpretations.push({
      root: firstNote,
      quality: '',
      fullName: `${uniqueNotes.join('-')} (unidentified)`,
      intervals: getIntervalNames(intervals),
      confidence: 0,
      explanation: 'No standard chord pattern detected'
    })
  }

  return {
    possibleChords: interpretations,
    selectedNotes: notes,
    uniqueNotes,
    noteCount
  }
}
