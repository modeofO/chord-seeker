import type { ChordQuality, IntervalSymbol, NoteId } from '../types/music'
import type { ChordProgression, ScaleDefinition, ScaleNote } from '../types/progression'
import { GUITAR_STRINGS, INDEX_TO_NOTE, NOTE_TO_INDEX, STRING_TUNINGS } from '../data/notes'

// Map intervals to semitone offsets from root
const INTERVAL_TO_SEMITONES: Record<IntervalSymbol, number> = {
  R: 0,
  'b2': 1,
  '2': 2,
  'b3': 3,
  '3': 4,
  '4': 5,
  '#4': 6,
  'b5': 6,
  '5': 7,
  '#5': 8,
  'b6': 8,
  '6': 9,
  'b7': 10,
  '7': 11,
  '9': 14
}

/**
 * Calculate the actual note from a root note and interval
 */
export function calculateNoteFromInterval(root: NoteId, interval: IntervalSymbol): NoteId {
  const rootIndex = NOTE_TO_INDEX[root]
  const semitones = INTERVAL_TO_SEMITONES[interval] || 0
  const targetIndex = (rootIndex + semitones) % 12
  return INDEX_TO_NOTE[targetIndex]
}

/**
 * Transpose a note by a number of semitones
 */
export function transposeNote(note: NoteId, semitones: number): NoteId {
  const noteIndex = NOTE_TO_INDEX[note]
  const targetIndex = (noteIndex + semitones + 12) % 12
  return INDEX_TO_NOTE[targetIndex]
}

/**
 * Generate all scale notes across the entire neck for a given scale and root
 */
export function generateScaleNotes(
  root: NoteId,
  scale: ScaleDefinition,
  maxFret: number = 15
): ScaleNote[] {
  const scaleNotes: ScaleNote[] = []

  // Calculate all notes in the scale
  const notesInScale = scale.intervals.map((interval) => ({
    note: calculateNoteFromInterval(root, interval),
    interval
  }))

  // For each string
  GUITAR_STRINGS.forEach((stringId) => {
    const tuning = STRING_TUNINGS[stringId]

    // Check each fret
    for (let fret = 0; fret <= maxFret; fret++) {
      const noteIndex = (tuning.index + fret) % 12
      const note = INDEX_TO_NOTE[noteIndex]

      // Check if this note is in the scale
      const scaleNote = notesInScale.find((sn) => sn.note === note)
      if (scaleNote) {
        scaleNotes.push({
          note,
          interval: scaleNote.interval,
          string: stringId,
          fret
        })
      }
    }
  })

  return scaleNotes
}

/**
 * Transpose a chord progression to a specific key
 */
export function transposeProgression(
  progression: ChordProgression,
  rootNote: NoteId
): Array<{ note: NoteId; quality: ChordQuality; degree: string }> {
  return progression.chords.map((chord) => ({
    note: transposeNote(rootNote, chord.scaleDegreeOffset),
    quality: chord.quality,
    degree: chord.degree
  }))
}

/**
 * Get the chord for a specific index in a transposed progression
 */
export function getProgressionChord(
  progression: ChordProgression,
  rootNote: NoteId,
  chordIndex: number
): { note: NoteId; quality: ChordQuality; degree: string } | null {
  const transposed = transposeProgression(progression, rootNote)
  return transposed[chordIndex] || null
}

/**
 * Determine if a scale is compatible with a chord quality
 */
export function isScaleCompatible(scale: ScaleDefinition, quality: ChordQuality): boolean {
  return scale.compatibleQualities.includes(quality)
}

/**
 * Get the best scale for a given chord in a progression
 */
export function getBestScaleForChord(
  chordQuality: ChordQuality,
  availableScales: ScaleDefinition[]
): ScaleDefinition | null {
  // Find scales compatible with this quality
  const compatible = availableScales.filter((scale) => isScaleCompatible(scale, chordQuality))

  if (compatible.length === 0) {
    return null
  }

  // Prioritize certain scales based on quality
  if (chordQuality === 'minor' || chordQuality === 'minor7') {
    return (
      compatible.find((s) => s.id === 'minorPentatonic') ||
      compatible.find((s) => s.id === 'dorian') ||
      compatible[0]
    )
  }

  if (chordQuality === 'major' || chordQuality === 'major7') {
    return (
      compatible.find((s) => s.id === 'majorPentatonic') ||
      compatible.find((s) => s.id === 'majorScale') ||
      compatible[0]
    )
  }

  if (chordQuality === 'dominant7') {
    return (
      compatible.find((s) => s.id === 'mixolydian') ||
      compatible.find((s) => s.id === 'bluesScale') ||
      compatible[0]
    )
  }

  return compatible[0]
}
