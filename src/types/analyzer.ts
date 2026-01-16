import type { GuitarString, NoteId } from './music'

export interface TuningDefinition {
  id: string
  name: string
  notes: [NoteId, NoteId, NoteId, NoteId, NoteId, NoteId] // [6, 5, 4, 3, 2, 1]
}

export interface SelectedNote {
  string: GuitarString
  fret: number
  note: NoteId
}

export type StringState = 'muted' | 'open' | number // number = fret

export interface ChordAnalysisResult {
  possibleChords: ChordInterpretation[]
  selectedNotes: NoteId[]
  uniqueNotes: NoteId[]
  noteCount: number
}

export interface ChordInterpretation {
  root: NoteId
  quality: string
  fullName: string
  intervals: string[]
  confidence: number // 0-100
  inversion?: string
  bassNote?: NoteId
  explanation?: string
}
