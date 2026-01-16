import type { TuningDefinition } from '../types/analyzer'

export const TUNING_PRESETS: Record<string, TuningDefinition> = {
  standard: {
    id: 'standard',
    name: 'Standard (E A D G B E)',
    notes: ['E', 'A', 'D', 'G', 'B', 'E']
  },
  dropD: {
    id: 'dropD',
    name: 'Drop D (D A D G B E)',
    notes: ['D', 'A', 'D', 'G', 'B', 'E']
  },
  dropC: {
    id: 'dropC',
    name: 'Drop C (C G C F A D)',
    notes: ['C', 'G', 'C', 'F', 'A', 'D']
  },
  halfStepDown: {
    id: 'halfStepDown',
    name: 'Half Step Down (D# G# C# F# A# D#)',
    notes: ['D#', 'G#', 'C#', 'F#', 'A#', 'D#']
  },
  wholeStepDown: {
    id: 'wholeStepDown',
    name: 'Whole Step Down (D G C F A D)',
    notes: ['D', 'G', 'C', 'F', 'A', 'D']
  },
  dadgad: {
    id: 'dadgad',
    name: 'DADGAD (D A D G A D)',
    notes: ['D', 'A', 'D', 'G', 'A', 'D']
  },
  openG: {
    id: 'openG',
    name: 'Open G (D G D G B D)',
    notes: ['D', 'G', 'D', 'G', 'B', 'D']
  },
  openD: {
    id: 'openD',
    name: 'Open D (D A D F# A D)',
    notes: ['D', 'A', 'D', 'F#', 'A', 'D']
  },
  openC: {
    id: 'openC',
    name: 'Open C (C G C G C E)',
    notes: ['C', 'G', 'C', 'G', 'C', 'E']
  },
  dropCSharp: {
    id: 'dropCSharp',
    name: 'Drop C# (C# G# C# F# A# D#)',
    notes: ['C#', 'G#', 'C#', 'F#', 'A#', 'D#']
  },
  cSharpStandardLowB: {
    id: 'cSharpStandardLowB',
    name: 'C# Standard Low B (C# F# B E G# B)',
    notes: ['C#', 'F#', 'B', 'E', 'G#', 'B']
  },
  dropB: {
    id: 'dropB',
    name: 'Drop B (B F# B E G# C#)',
    notes: ['B', 'F#', 'B', 'E', 'G#', 'C#']
  },
  dropA: {
    id: 'dropA',
    name: 'Drop A (A E A D F# B)',
    notes: ['A', 'E', 'A', 'D', 'F#', 'B']
  },
  openE: {
    id: 'openE',
    name: 'Open E (E B E G# B E)',
    notes: ['E', 'B', 'E', 'G#', 'B', 'E']
  },
  openA: {
    id: 'openA',
    name: 'Open A (E A E A C# E)',
    notes: ['E', 'A', 'E', 'A', 'C#', 'E']
  }
}

export const TUNING_LIST = Object.values(TUNING_PRESETS)
