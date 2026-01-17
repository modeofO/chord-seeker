import type { GuitarString } from '../types/music'
import type { TabSheet, TabPosition, Technique, Track } from '../types/songBuilder'

/**
 * ASCII tab export utilities
 * Creates text-based guitar tablature for easy sharing and printing
 */

const STRING_LABELS: Record<GuitarString, string> = {
  1: 'e',
  2: 'B',
  3: 'G',
  4: 'D',
  5: 'A',
  6: 'E'
}

// Display order: high strings at top
const DISPLAY_ORDER: GuitarString[] = [1, 2, 3, 4, 5, 6]

// Technique symbols for ASCII display
const TECHNIQUE_SYMBOLS: Record<Technique, string> = {
  'normal': '',
  'hammer-on': 'h',
  'pull-off': 'p',
  'slide-up': '/',
  'slide-down': '\\',
  'bend': 'b',
  'harmonic': '*',
  'muted': 'x'
}

/**
 * Get display text for a tab position in ASCII format
 */
function getAsciiTabText(position: TabPosition): string {
  if (position.fret === null) {
    return '-'
  }

  const technique = position.technique || 'normal'

  if (technique === 'muted') {
    return 'x'
  }

  if (technique === 'harmonic') {
    return `<${position.fret}>`
  }

  const symbol = TECHNIQUE_SYMBOLS[technique]
  let text = String(position.fret)

  if (position.targetFret !== undefined) {
    if (technique === 'slide-up' || technique === 'slide-down') {
      text += `${symbol}${position.targetFret}`
    } else if (technique === 'bend') {
      text += 'b'
    }
  } else if (symbol && technique !== 'normal') {
    text += symbol
  }

  return text
}

/**
 * Pad a string to a fixed width, centered
 */
function padCenter(str: string, width: number): string {
  if (str.length >= width) return str
  const left = Math.floor((width - str.length) / 2)
  const right = width - str.length - left
  return '-'.repeat(left) + str + '-'.repeat(right)
}

/**
 * Export a TabSheet to ASCII tablature format
 */
export function exportTabSheetToAscii(tabSheet: TabSheet, title?: string): string {
  const lines: string[] = []
  const subdivisionWidth = 4 // Width per subdivision in characters

  // Add title/header
  if (title) {
    lines.push(`# ${title}`)
    lines.push(`# BPM: ${tabSheet.bpm}`)
    lines.push('')
  }

  // Process measures in groups of 4 for readability
  const measuresPerLine = 4
  const totalMeasures = tabSheet.measures.length

  for (let startMeasure = 0; startMeasure < totalMeasures; startMeasure += measuresPerLine) {
    const endMeasure = Math.min(startMeasure + measuresPerLine, totalMeasures)
    const measureGroup = tabSheet.measures.slice(startMeasure, endMeasure)

    // Add chord names line
    let chordLine = '   ' // Initial padding for string label
    measureGroup.forEach((measure) => {
      const measureWidth = measure.subdivisions * subdivisionWidth + 1
      const chordText = `${measure.chordName} (${measure.chordDegree})`
      chordLine += chordText.padEnd(measureWidth)
    })
    lines.push(chordLine)

    // Build each string line
    DISPLAY_ORDER.forEach((stringId) => {
      let stringLine = STRING_LABELS[stringId] + '|'

      measureGroup.forEach((measure) => {
        measure.positions[stringId].forEach((fret, subIndex) => {
          // Get technique info if available
          const tabPosition = measure.positionsWithTechnique?.[stringId]?.[subIndex] || { fret }
          const displayText = tabPosition.fret !== null
            ? getAsciiTabText(tabPosition)
            : '-'

          stringLine += padCenter(displayText, subdivisionWidth)
        })
        stringLine += '|'
      })

      lines.push(stringLine)
    })

    lines.push('') // Blank line between groups
  }

  return lines.join('\n')
}

/**
 * Export a single track to ASCII tab
 */
export function exportTrackToAscii(track: Track): string {
  // Build a TabSheet from the track's riff
  const tabSheet = buildTabSheetFromRiff(track.riff)
  return exportTabSheetToAscii(tabSheet, `${track.name} (${track.type})`)
}

/**
 * Export all tracks to a combined ASCII tab document
 */
export function exportAllTracksToAscii(tracks: Track[], bpm: number): string {
  const sections: string[] = []

  sections.push('=' .repeat(60))
  sections.push('GUITAR TABLATURE EXPORT')
  sections.push(`BPM: ${bpm}`)
  sections.push(`Tracks: ${tracks.length}`)
  sections.push('=' .repeat(60))
  sections.push('')

  tracks.forEach((track, index) => {
    sections.push('-'.repeat(60))
    sections.push(`TRACK ${index + 1}: ${track.name.toUpperCase()}`)
    sections.push(`Type: ${track.type === 'riff' ? 'Riff/Lead' : 'Chord Rhythm'}`)
    sections.push(`Volume: ${Math.round(track.volume * 100)}%`)
    sections.push('-'.repeat(60))
    sections.push('')

    const tabSheet = buildTabSheetFromRiff(track.riff)
    sections.push(exportTabSheetToAscii(tabSheet))
    sections.push('')
  })

  return sections.join('\n')
}

/**
 * Build a TabSheet from a ProgressionRiff
 */
function buildTabSheetFromRiff(riff: import('../types/songBuilder').ProgressionRiff): TabSheet {
  const subdivisions = 8 // Eighth note resolution

  const measures = riff.chordRiffs.map((chordRiff) => {
    // Initialize positions
    const positions: Record<GuitarString, (number | null)[]> = {
      1: Array(subdivisions).fill(null),
      2: Array(subdivisions).fill(null),
      3: Array(subdivisions).fill(null),
      4: Array(subdivisions).fill(null),
      5: Array(subdivisions).fill(null),
      6: Array(subdivisions).fill(null)
    }

    const positionsWithTechnique: Record<GuitarString, TabPosition[]> = {
      1: Array(subdivisions).fill(null).map(() => ({ fret: null })),
      2: Array(subdivisions).fill(null).map(() => ({ fret: null })),
      3: Array(subdivisions).fill(null).map(() => ({ fret: null })),
      4: Array(subdivisions).fill(null).map(() => ({ fret: null })),
      5: Array(subdivisions).fill(null).map(() => ({ fret: null })),
      6: Array(subdivisions).fill(null).map(() => ({ fret: null }))
    }

    // Place notes
    chordRiff.notes.forEach((note) => {
      const subIndex = Math.floor(note.startBeat * 2) // Convert beats to eighth notes
      if (subIndex >= 0 && subIndex < subdivisions) {
        positions[note.string][subIndex] = note.fret
        positionsWithTechnique[note.string][subIndex] = {
          fret: note.fret,
          technique: note.technique,
          targetFret: note.targetFret
        }
      }
    })

    return {
      chordName: `${chordRiff.chordRoot}${chordRiff.chordQuality === 'major' ? '' : chordRiff.chordQuality === 'minor' ? 'm' : chordRiff.chordQuality}`,
      chordDegree: chordRiff.chordDegree,
      positions,
      positionsWithTechnique,
      subdivisions
    }
  })

  return {
    measures,
    bpm: riff.bpm,
    beatsPerMeasure: 4
  }
}

/**
 * Download tab as a text file
 */
export function downloadTab(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Generate filename for tab export
 */
export function generateTabFilename(trackName: string): string {
  const sanitized = trackName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  return `${sanitized}_tab.txt`
}
