import { STRING_TUNINGS } from '../data/notes'
import type { ProgressionRiff, Track } from '../types/songBuilder'
import type { RuntimeChordShape } from '../types/music'
import { buildChordShapes } from './chordUtils'

/**
 * MIDI file export utilities
 * Creates standard MIDI files (SMF format 0/1) for DAW import
 */

// MIDI constants
const TICKS_PER_BEAT = 480 // Standard resolution

/**
 * Convert a variable-length quantity for MIDI format
 */
function writeVarLen(value: number): number[] {
  const bytes: number[] = []
  let v = value

  bytes.unshift(v & 0x7f)
  while ((v >>= 7) > 0) {
    bytes.unshift((v & 0x7f) | 0x80)
  }

  return bytes
}

/**
 * Write a 16-bit big-endian integer
 */
function writeInt16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff]
}

/**
 * Write a 32-bit big-endian integer
 */
function writeInt32(value: number): number[] {
  return [
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff
  ]
}

/**
 * Convert string/fret position to MIDI note number
 */
function fretToMidi(stringId: number, fret: number): number {
  const tuning = STRING_TUNINGS[stringId as keyof typeof STRING_TUNINGS]
  return tuning.midi + fret
}

/**
 * Create a MIDI track chunk
 */
function createTrackChunk(events: number[][]): number[] {
  // Flatten events
  const trackData: number[] = []
  events.forEach(event => trackData.push(...event))

  // Add end of track meta event
  trackData.push(...writeVarLen(0)) // Delta time 0
  trackData.push(0xff, 0x2f, 0x00) // End of track

  // Track header: MTrk + length
  const header = [0x4d, 0x54, 0x72, 0x6b] // "MTrk"
  header.push(...writeInt32(trackData.length))

  return [...header, ...trackData]
}

/**
 * Create a tempo meta event
 */
function createTempoEvent(bpm: number): number[] {
  const microsecondsPerBeat = Math.round(60000000 / bpm)
  return [
    ...writeVarLen(0), // Delta time
    0xff, 0x51, 0x03, // Tempo meta event
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff
  ]
}

/**
 * Create a track name meta event
 */
function createTrackNameEvent(name: string): number[] {
  const nameBytes = Array.from(name).map(c => c.charCodeAt(0))
  return [
    ...writeVarLen(0), // Delta time
    0xff, 0x03, // Track name meta event
    nameBytes.length,
    ...nameBytes
  ]
}

/**
 * Create note on event
 */
function createNoteOn(deltaTime: number, channel: number, note: number, velocity: number): number[] {
  return [
    ...writeVarLen(deltaTime),
    0x90 | (channel & 0x0f),
    note & 0x7f,
    velocity & 0x7f
  ]
}

/**
 * Create note off event
 */
function createNoteOff(deltaTime: number, channel: number, note: number): number[] {
  return [
    ...writeVarLen(deltaTime),
    0x80 | (channel & 0x0f),
    note & 0x7f,
    0x00 // Velocity 0 for note off
  ]
}

/**
 * Export riff as MIDI file
 */
export function exportRiffToMidi(riff: ProgressionRiff): Uint8Array {
  const events: number[][] = []

  // Add track name
  events.push(createTrackNameEvent('Guitar Riff'))

  // Add tempo
  events.push(createTempoEvent(riff.bpm))

  // Collect all note events with absolute times
  const noteEvents: Array<{
    time: number
    type: 'on' | 'off'
    note: number
    velocity: number
  }> = []

  let measureStartTick = 0
  const ticksPerMeasure = TICKS_PER_BEAT * 4 // 4/4 time

  riff.chordRiffs.forEach((chordRiff) => {
    chordRiff.notes.forEach((note) => {
      const midiNote = fretToMidi(note.string, note.fret)
      const startTick = measureStartTick + Math.round(note.startBeat * TICKS_PER_BEAT)
      const endTick = startTick + Math.round(note.duration * TICKS_PER_BEAT)

      // Adjust velocity based on technique
      let velocity = 100
      if (note.technique === 'hammer-on' || note.technique === 'pull-off') {
        velocity = 80 // Softer for legato
      } else if (note.technique === 'muted') {
        velocity = 60 // Even softer for muted
      } else if (note.technique === 'harmonic') {
        velocity = 90
      }

      noteEvents.push({ time: startTick, type: 'on', note: midiNote, velocity })
      noteEvents.push({ time: endTick, type: 'off', note: midiNote, velocity: 0 })
    })

    measureStartTick += ticksPerMeasure
  })

  // Sort events by time, note offs before note ons at same time
  noteEvents.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time
    if (a.type !== b.type) return a.type === 'off' ? -1 : 1
    return 0
  })

  // Convert to delta times and create MIDI events
  let lastTime = 0
  noteEvents.forEach((event) => {
    const deltaTime = event.time - lastTime
    lastTime = event.time

    if (event.type === 'on') {
      events.push(createNoteOn(deltaTime, 0, event.note, event.velocity))
    } else {
      events.push(createNoteOff(deltaTime, 0, event.note))
    }
  })

  // Create MIDI file
  const trackChunk = createTrackChunk(events)

  // Header chunk: MThd + length(6) + format(0) + tracks(1) + division
  const header = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    ...writeInt32(6), // Header length
    ...writeInt16(0), // Format 0 (single track)
    ...writeInt16(1), // Number of tracks
    ...writeInt16(TICKS_PER_BEAT) // Ticks per beat
  ]

  return new Uint8Array([...header, ...trackChunk])
}

/**
 * Export chords as MIDI file
 */
export function exportChordsToMidi(riff: ProgressionRiff): Uint8Array {
  const events: number[][] = []

  // Add track name
  events.push(createTrackNameEvent('Chord Progression'))

  // Add tempo
  events.push(createTempoEvent(riff.bpm))

  // Collect all note events
  const noteEvents: Array<{
    time: number
    type: 'on' | 'off'
    note: number
    velocity: number
  }> = []

  let measureStartTick = 0
  const ticksPerMeasure = TICKS_PER_BEAT * 4

  riff.chordRiffs.forEach((chordRiff) => {
    // Get chord shape for this chord
    const shapes = buildChordShapes(chordRiff.chordRoot, chordRiff.chordQuality)
    const shape = shapes[0] as RuntimeChordShape | undefined

    if (shape && shape.notesForAudio) {
      // Add chord notes at the start of each measure
      const chordDuration = ticksPerMeasure // Whole note duration

      shape.notesForAudio.forEach((noteInfo, index) => {
        const midiNote = fretToMidi(noteInfo.string, noteInfo.fret)
        // Stagger start times slightly for strum effect
        const startTick = measureStartTick + index * 10
        const endTick = measureStartTick + chordDuration - 10

        noteEvents.push({ time: startTick, type: 'on', note: midiNote, velocity: 90 })
        noteEvents.push({ time: endTick, type: 'off', note: midiNote, velocity: 0 })
      })
    }

    measureStartTick += ticksPerMeasure
  })

  // Sort events by time
  noteEvents.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time
    if (a.type !== b.type) return a.type === 'off' ? -1 : 1
    return 0
  })

  // Convert to delta times
  let lastTime = 0
  noteEvents.forEach((event) => {
    const deltaTime = event.time - lastTime
    lastTime = event.time

    if (event.type === 'on') {
      events.push(createNoteOn(deltaTime, 0, event.note, event.velocity))
    } else {
      events.push(createNoteOff(deltaTime, 0, event.note))
    }
  })

  // Create MIDI file
  const trackChunk = createTrackChunk(events)

  const header = [
    0x4d, 0x54, 0x68, 0x64,
    ...writeInt32(6),
    ...writeInt16(0),
    ...writeInt16(1),
    ...writeInt16(TICKS_PER_BEAT)
  ]

  return new Uint8Array([...header, ...trackChunk])
}

/**
 * Export multiple tracks as a Format 1 MIDI file
 * Each track becomes a separate MIDI track
 */
export function exportTracksToMidi(tracks: Track[], bpm: number): Uint8Array {
  const allTrackChunks: number[][] = []
  const ticksPerMeasure = TICKS_PER_BEAT * 4

  // Track 0: Tempo track (required for Format 1)
  const tempoTrackEvents: number[][] = []
  tempoTrackEvents.push(createTrackNameEvent('Tempo Track'))
  tempoTrackEvents.push(createTempoEvent(bpm))
  allTrackChunks.push(createTrackChunk(tempoTrackEvents))

  // Create a MIDI track for each Track
  tracks.forEach((track, trackIndex) => {
    const events: number[][] = []
    const channel = trackIndex % 16 // MIDI has 16 channels

    // Add track name
    events.push(createTrackNameEvent(track.name))

    // Collect note events
    const noteEvents: Array<{
      time: number
      type: 'on' | 'off'
      note: number
      velocity: number
    }> = []

    let measureStartTick = 0

    track.riff.chordRiffs.forEach((chordRiff) => {
      if (track.type === 'chord') {
        // Export as chord strums
        const shapes = buildChordShapes(chordRiff.chordRoot, chordRiff.chordQuality)
        const shape = shapes[0] as RuntimeChordShape | undefined

        if (shape && shape.notesForAudio) {
          const chordDuration = ticksPerMeasure

          shape.notesForAudio.forEach((noteInfo, index) => {
            const midiNote = fretToMidi(noteInfo.string, noteInfo.fret)
            const startTick = measureStartTick + index * 10
            const endTick = measureStartTick + chordDuration - 10
            const velocity = Math.round(track.volume * 90)

            noteEvents.push({ time: startTick, type: 'on', note: midiNote, velocity })
            noteEvents.push({ time: endTick, type: 'off', note: midiNote, velocity: 0 })
          })
        }
      } else {
        // Export as individual riff notes
        chordRiff.notes.forEach((note) => {
          const midiNote = fretToMidi(note.string, note.fret)
          const startTick = measureStartTick + Math.round(note.startBeat * TICKS_PER_BEAT)
          const endTick = startTick + Math.round(note.duration * TICKS_PER_BEAT)

          let velocity = Math.round(track.volume * 100)
          if (note.technique === 'hammer-on' || note.technique === 'pull-off') {
            velocity = Math.round(velocity * 0.8)
          } else if (note.technique === 'muted') {
            velocity = Math.round(velocity * 0.6)
          }

          noteEvents.push({ time: startTick, type: 'on', note: midiNote, velocity })
          noteEvents.push({ time: endTick, type: 'off', note: midiNote, velocity: 0 })
        })
      }

      measureStartTick += ticksPerMeasure
    })

    // Sort events by time
    noteEvents.sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time
      if (a.type !== b.type) return a.type === 'off' ? -1 : 1
      return 0
    })

    // Convert to delta times
    let lastTime = 0
    noteEvents.forEach((event) => {
      const deltaTime = event.time - lastTime
      lastTime = event.time

      if (event.type === 'on') {
        events.push(createNoteOn(deltaTime, channel, event.note, event.velocity))
      } else {
        events.push(createNoteOff(deltaTime, channel, event.note))
      }
    })

    allTrackChunks.push(createTrackChunk(events))
  })

  // Header chunk for Format 1 (multiple tracks)
  const header = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    ...writeInt32(6), // Header length
    ...writeInt16(1), // Format 1 (multi-track)
    ...writeInt16(allTrackChunks.length), // Number of tracks
    ...writeInt16(TICKS_PER_BEAT) // Ticks per beat
  ]

  // Combine all chunks
  const midiData = [...header]
  allTrackChunks.forEach(chunk => midiData.push(...chunk))

  return new Uint8Array(midiData)
}

/**
 * Download a MIDI file
 */
export function downloadMidi(data: Uint8Array, filename: string): void {
  // Create a new ArrayBuffer and copy data for Blob compatibility
  const arrayBuffer = new ArrayBuffer(data.length)
  const view = new Uint8Array(arrayBuffer)
  view.set(data)

  const blob = new Blob([arrayBuffer], { type: 'audio/midi' })
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
 * Generate filename based on progression info
 */
export function generateMidiFilename(riff: ProgressionRiff, type: 'riff' | 'chords'): string {
  const chordNames = riff.chordRiffs.map(c => c.chordRoot).join('-')
  const style = riff.style
  const bpm = riff.bpm

  return `${chordNames}_${style}_${bpm}bpm_${type}.mid`
}
