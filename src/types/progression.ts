import type { ChordQuality, IntervalSymbol, NoteId } from './music'

export type ScaleDegree = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII'
export type ScaleDegreeFlat = 'bII' | 'bIII' | 'bV' | 'bVI' | 'bVII'
export type ScaleDegreeFull = ScaleDegree | ScaleDegreeFlat

export interface ProgressionChord {
  degree: string // Roman numeral notation (e.g., "I", "ii", "V7")
  quality: ChordQuality
  scaleDegreeOffset: number // Semitones from root (0-11)
}

export interface ChordProgression {
  id: string
  name: string
  description: string
  chords: ProgressionChord[]
  genre?: string
}

export interface ScaleDefinition {
  id: string
  name: string
  displayName: string
  intervals: IntervalSymbol[]
  description: string
  compatibleQualities: ChordQuality[]
}

export interface ScaleNote {
  note: NoteId
  interval: IntervalSymbol
  string: number
  fret: number
}

export interface ScaleVisualization {
  scale: ScaleDefinition
  root: NoteId
  notes: ScaleNote[]
}

export type AnimationSpeed = 'slow' | 'medium' | 'fast'
export type AnimationState = 'playing' | 'paused'
