import { STRING_TUNINGS } from '../data/notes'
import type { GuitarString, NoteId, ChordQuality } from '../types/music'
import type { RuntimeChordShape } from '../types/music'
import type { ProgressionRiff, TabSheet, Technique, Track } from '../types/songBuilder'
import { buildChordShapes } from '../utils/chordUtils'
import { orderNotesForStrum } from './engine'

export interface NoteToPlay {
  string: GuitarString
  fret: number
  technique?: Technique
  targetFret?: number
}

interface ScheduledEvent {
  type: 'chord' | 'riff'
  trackId: string
  time: number
  notes: NoteToPlay[]
  duration: number
}

const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

export class SongAudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private trackGains: Map<string, GainNode> = new Map()
  private trackMuted: Map<string, boolean> = new Map()
  // Legacy gain nodes for single-track preview mode
  private chordGain: GainNode | null = null
  private riffGain: GainNode | null = null
  private activeNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = []
  private scheduledEvents: ScheduledEvent[] = []
  private isPlaying = false
  private startTime = 0
  private pauseTime = 0
  private animationFrameId: number | null = null
  private onBeatCallback: ((measure: number, subdivision: number) => void) | null = null
  private loopDuration = 0
  private lastScheduledLoop = -1

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext()

      // Create master gain node
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.8
      this.masterGain.connect(this.ctx.destination)

      // Create legacy gain nodes for single-track preview mode
      this.chordGain = this.ctx.createGain()
      this.chordGain.gain.value = 0.3 // Quieter for backing
      this.chordGain.connect(this.masterGain)

      this.riffGain = this.ctx.createGain()
      this.riffGain.gain.value = 0.6 // Louder for melody
      this.riffGain.connect(this.masterGain)
    }
    return this.ctx
  }

  /**
   * Create or get a gain node for a specific track
   */
  createTrackAudio(trackId: string, volume: number = 0.7): GainNode {
    const ctx = this.ensureContext()

    if (this.trackGains.has(trackId)) {
      const gain = this.trackGains.get(trackId)!
      gain.gain.value = volume
      return gain
    }

    const gain = ctx.createGain()
    gain.gain.value = volume
    gain.connect(this.masterGain!)
    this.trackGains.set(trackId, gain)
    this.trackMuted.set(trackId, false)
    return gain
  }

  /**
   * Remove a track's audio node
   */
  removeTrackAudio(trackId: string): void {
    const gain = this.trackGains.get(trackId)
    if (gain) {
      gain.disconnect()
      this.trackGains.delete(trackId)
      this.trackMuted.delete(trackId)
    }
  }

  /**
   * Set volume for a specific track
   */
  setTrackVolume(trackId: string, volume: number): void {
    const gain = this.trackGains.get(trackId)
    if (gain) {
      gain.gain.value = volume
    }
  }

  /**
   * Set muted state for a specific track
   */
  setTrackMuted(trackId: string, muted: boolean): void {
    this.trackMuted.set(trackId, muted)
    const gain = this.trackGains.get(trackId)
    if (gain) {
      // Store the volume before muting or restore it
      if (muted) {
        gain.gain.value = 0
      }
    }
  }

  /**
   * Update solo states - when any track is soloed, only soloed tracks play
   */
  updateSoloState(tracks: Track[]): void {
    const anySoloed = tracks.some(t => t.isSoloed)

    tracks.forEach(track => {
      const gain = this.trackGains.get(track.id)
      if (!gain) return

      if (anySoloed) {
        // Only soloed tracks should be audible
        if (track.isSoloed && !track.isMuted) {
          gain.gain.value = track.volume
        } else {
          gain.gain.value = 0
        }
      } else {
        // No solo - respect mute states
        if (track.isMuted) {
          gain.gain.value = 0
        } else {
          gain.gain.value = track.volume
        }
      }
    })
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume
    }
  }

  /**
   * Schedule a chord to play at a specific time
   */
  private scheduleChord(notes: NoteToPlay[], startTime: number, duration: number, trackId?: string) {
    const ctx = this.ensureContext()

    // Determine which gain node to use
    const targetGain = trackId
      ? this.trackGains.get(trackId)
      : this.chordGain
    if (!targetGain) return

    const orderedNotes = orderNotesForStrum(notes)

    orderedNotes.forEach((note, index) => {
      const tuning = STRING_TUNINGS[note.string]
      const midiValue = tuning.midi + note.fret
      const freq = midiToFrequency(midiValue)

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      const strikeTime = startTime + index * 0.025 // Slightly faster strum

      osc.frequency.setValueAtTime(freq, strikeTime)
      gain.gain.setValueAtTime(0.0001, strikeTime)
      gain.gain.linearRampToValueAtTime(0.4, strikeTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + Math.min(duration, 1.5))

      osc.connect(gain)
      gain.connect(targetGain)

      osc.start(strikeTime)
      osc.stop(strikeTime + duration + 0.1)

      this.activeNodes.push({ osc, gain })
    })
  }

  /**
   * Schedule a single riff note to play at a specific time
   */
  private scheduleRiffNote(note: NoteToPlay, startTime: number, duration: number, trackId?: string) {
    const ctx = this.ensureContext()

    // Determine which gain node to use
    const targetGain = trackId
      ? this.trackGains.get(trackId)
      : this.riffGain
    if (!targetGain) return

    const tuning = STRING_TUNINGS[note.string]
    const technique = note.technique || 'normal'

    // Handle muted notes differently
    if (technique === 'muted') {
      this.scheduleMutedNote(note, startTime, trackId)
      return
    }

    // Handle harmonics
    if (technique === 'harmonic') {
      this.scheduleHarmonicNote(note, startTime, duration, trackId)
      return
    }

    const midiValue = tuning.midi + note.fret
    const freq = midiToFrequency(midiValue)

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    // Adjust oscillator type based on technique
    if (technique === 'hammer-on' || technique === 'pull-off') {
      osc.type = 'sine' // Smoother attack for legato
    } else {
      osc.type = 'triangle'
    }

    // Handle slides
    if ((technique === 'slide-up' || technique === 'slide-down') && note.targetFret !== undefined) {
      const targetMidiValue = tuning.midi + note.targetFret
      const targetFreq = midiToFrequency(targetMidiValue)

      osc.frequency.setValueAtTime(freq, startTime)
      osc.frequency.linearRampToValueAtTime(targetFreq, startTime + duration * 0.8)

      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.linearRampToValueAtTime(0.6, startTime + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(duration, 0.9))
    }
    // Handle bends
    else if (technique === 'bend' && note.targetFret !== undefined) {
      const targetMidiValue = tuning.midi + note.targetFret
      const targetFreq = midiToFrequency(targetMidiValue)

      osc.frequency.setValueAtTime(freq, startTime)
      // Bend up smoothly
      osc.frequency.linearRampToValueAtTime(targetFreq, startTime + duration * 0.3)
      // Hold the bent note
      osc.frequency.setValueAtTime(targetFreq, startTime + duration * 0.7)

      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.linearRampToValueAtTime(0.65, startTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(duration, 0.9))
    }
    // Handle hammer-on/pull-off (softer attack)
    else if (technique === 'hammer-on' || technique === 'pull-off') {
      osc.frequency.setValueAtTime(freq, startTime)
      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.linearRampToValueAtTime(0.5, startTime + 0.002) // Faster, softer attack
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(duration, 0.7))
    }
    // Normal note
    else {
      osc.frequency.setValueAtTime(freq, startTime)
      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.linearRampToValueAtTime(0.6, startTime + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(duration, 0.8))
    }

    osc.connect(gain)
    gain.connect(targetGain)

    osc.start(startTime)
    osc.stop(startTime + duration + 0.1)

    this.activeNodes.push({ osc, gain })
  }

  /**
   * Schedule a muted/dead note
   */
  private scheduleMutedNote(note: NoteToPlay, startTime: number, trackId?: string) {
    const ctx = this.ensureContext()

    const targetGain = trackId
      ? this.trackGains.get(trackId)
      : this.riffGain
    if (!targetGain) return

    // Create short percussive noise for muted note
    const bufferSize = ctx.sampleRate * 0.05 // 50ms of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    // Fill with filtered noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2))
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 200 + note.string * 50 // Vary by string
    filter.Q.value = 2

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.3, startTime)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(targetGain)

    source.start(startTime)
  }

  /**
   * Schedule a harmonic note
   */
  private scheduleHarmonicNote(note: NoteToPlay, startTime: number, duration: number, trackId?: string) {
    const ctx = this.ensureContext()

    const targetGain = trackId
      ? this.trackGains.get(trackId)
      : this.riffGain
    if (!targetGain) return

    const tuning = STRING_TUNINGS[note.string]
    const baseMidiValue = tuning.midi // Open string

    // Calculate harmonic frequency based on fret position
    // Natural harmonics: 12th fret = 2x, 7th fret = 3x, 5th fret = 4x
    let multiplier = 2
    if (note.fret === 7 || note.fret === 19) multiplier = 3
    else if (note.fret === 5 || note.fret === 24) multiplier = 4

    const baseFreq = midiToFrequency(baseMidiValue)
    const harmonicFreq = baseFreq * multiplier

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine' // Pure sine for bell-like harmonic
    osc.frequency.setValueAtTime(harmonicFreq, startTime)

    // Harmonics have a distinctive bell-like envelope
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.linearRampToValueAtTime(0.5, startTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(duration * 2, 1.5))

    osc.connect(gain)
    gain.connect(targetGain)

    osc.start(startTime)
    osc.stop(startTime + duration + 0.5)

    this.activeNodes.push({ osc, gain })
  }

  /**
   * Build schedule from progression riff and chord shapes (legacy single-track mode)
   */
  scheduleProgression(riff: ProgressionRiff, _tabSheet: TabSheet): void {
    this.scheduledEvents = []
    this.ensureContext()

    const beatsPerSecond = riff.bpm / 60
    const secondsPerBeat = 1 / beatsPerSecond
    const secondsPerMeasure = 4 * secondsPerBeat // Assuming 4/4 time

    let currentTime = 0

    riff.chordRiffs.forEach((chordRiff) => {
      // Schedule chord strum at the beginning of each measure
      const chordShape = this.getChordShape(chordRiff.chordRoot, chordRiff.chordQuality)
      if (chordShape) {
        this.scheduledEvents.push({
          type: 'chord',
          trackId: '_legacy_chord',
          time: currentTime,
          notes: chordShape.notesForAudio,
          duration: secondsPerMeasure
        })
      }

      // Schedule each riff note
      chordRiff.notes.forEach((note) => {
        const noteTime = currentTime + note.startBeat * secondsPerBeat
        const noteDuration = note.duration * secondsPerBeat

        this.scheduledEvents.push({
          type: 'riff',
          trackId: '_legacy_riff',
          time: noteTime,
          notes: [{
            string: note.string,
            fret: note.fret,
            technique: note.technique,
            targetFret: note.targetFret
          }],
          duration: noteDuration
        })
      })

      currentTime += secondsPerMeasure
    })

    // Store total loop duration
    this.loopDuration = currentTime
  }

  /**
   * Build schedule from multiple tracks
   */
  scheduleAllTracks(tracks: Track[], bpm: number): void {
    this.scheduledEvents = []
    this.ensureContext()

    const beatsPerSecond = bpm / 60
    const secondsPerBeat = 1 / beatsPerSecond
    const secondsPerMeasure = 4 * secondsPerBeat

    // Find the longest track to determine loop duration
    let maxDuration = 0

    tracks.forEach(track => {
      // Ensure track has audio node
      this.createTrackAudio(track.id, track.volume)

      let currentTime = 0

      track.riff.chordRiffs.forEach((chordRiff) => {
        if (track.type === 'chord') {
          // Schedule chord strums
          const chordShape = this.getChordShape(chordRiff.chordRoot, chordRiff.chordQuality)
          if (chordShape) {
            this.scheduledEvents.push({
              type: 'chord',
              trackId: track.id,
              time: currentTime,
              notes: chordShape.notesForAudio,
              duration: secondsPerMeasure
            })
          }
        } else {
          // Schedule riff notes
          chordRiff.notes.forEach((note) => {
            const noteTime = currentTime + note.startBeat * secondsPerBeat
            const noteDuration = note.duration * secondsPerBeat

            this.scheduledEvents.push({
              type: 'riff',
              trackId: track.id,
              time: noteTime,
              notes: [{
                string: note.string,
                fret: note.fret,
                technique: note.technique,
                targetFret: note.targetFret
              }],
              duration: noteDuration
            })
          })
        }

        currentTime += secondsPerMeasure
      })

      maxDuration = Math.max(maxDuration, currentTime)
    })

    this.loopDuration = maxDuration
  }

  /**
   * Schedule events for a specific loop iteration
   */
  private scheduleLoopEvents(loopIndex: number): void {
    if (!this.ctx) return

    const loopStartTime = this.startTime + loopIndex * this.loopDuration

    this.scheduledEvents.forEach((event) => {
      const eventTime = loopStartTime + event.time

      // Only schedule if event is in the future
      if (eventTime >= this.ctx!.currentTime - 0.1) {
        // Determine trackId - use undefined for legacy mode to use legacy gain nodes
        const trackId = event.trackId.startsWith('_legacy') ? undefined : event.trackId

        if (event.type === 'chord') {
          this.scheduleChord(event.notes, eventTime, event.duration, trackId)
        } else {
          event.notes.forEach((note) => {
            this.scheduleRiffNote(note, eventTime, event.duration, trackId)
          })
        }
      }
    })
  }

  /**
   * Get a chord shape for a given root and quality
   */
  private getChordShape(root: NoteId, quality: ChordQuality): RuntimeChordShape | null {
    const shapes = buildChordShapes(root, quality)
    // Return the first shape (usually the most common voicing)
    return shapes[0] || null
  }

  /**
   * Set callback for beat updates
   */
  onBeat(callback: (measure: number, subdivision: number) => void) {
    this.onBeatCallback = callback
  }

  /**
   * Start playback (legacy single-track mode)
   */
  play(riff: ProgressionRiff, tabSheet: TabSheet): void {
    const ctx = this.ensureContext()

    if (this.isPlaying) {
      this.pause()
    }

    this.scheduleProgression(riff, tabSheet)

    const playbackOffset = this.pauseTime
    this.startTime = ctx.currentTime - playbackOffset
    this.isPlaying = true
    this.lastScheduledLoop = -1

    // Schedule the first loop
    this.scheduleLoopEvents(0)

    // Start beat tracking with loop detection
    this.startBeatTracking(riff.bpm, tabSheet)
  }

  /**
   * Start playback of all tracks
   */
  playAllTracks(tracks: Track[], tabSheet: TabSheet, bpm: number): void {
    const ctx = this.ensureContext()

    if (this.isPlaying) {
      this.pause()
    }

    // Schedule all tracks (this creates the gain nodes)
    this.scheduleAllTracks(tracks, bpm)

    // Update solo/mute states AFTER gain nodes are created
    this.updateSoloState(tracks)

    const playbackOffset = this.pauseTime
    this.startTime = ctx.currentTime - playbackOffset
    this.isPlaying = true
    this.lastScheduledLoop = -1

    // Schedule the first loop
    this.scheduleLoopEvents(0)

    // Start beat tracking
    this.startBeatTracking(bpm, tabSheet)
  }

  /**
   * Start tracking beats for UI updates
   */
  private startBeatTracking(bpm: number, tabSheet: TabSheet) {
    if (!this.ctx || !this.onBeatCallback) return

    const beatsPerSecond = bpm / 60
    const subdivisions = tabSheet.measures[0]?.subdivisions || 8
    const subdivisionsPerSecond = (beatsPerSecond * subdivisions) / 4
    const totalMeasures = tabSheet.measures.length
    const totalSubdivisionsPerLoop = totalMeasures * subdivisions

    const update = () => {
      if (!this.isPlaying || !this.ctx) return

      const elapsed = this.ctx.currentTime - this.startTime
      const totalSubdivisions = elapsed * subdivisionsPerSecond
      const currentLoop = Math.floor(totalSubdivisions / totalSubdivisionsPerLoop)
      const subdivisionInLoop = totalSubdivisions % totalSubdivisionsPerLoop
      const subdivisionIndex = Math.floor(subdivisionInLoop) % subdivisions
      const measureIndex = Math.floor(subdivisionInLoop / subdivisions)

      // Schedule next loop ahead of time (when we're 80% through current loop)
      if (currentLoop > this.lastScheduledLoop) {
        this.lastScheduledLoop = currentLoop
        // Schedule the next loop
        this.scheduleLoopEvents(currentLoop + 1)
      }

      this.onBeatCallback?.(measureIndex, subdivisionIndex)

      this.animationFrameId = requestAnimationFrame(update)
    }

    update()
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.ctx || !this.isPlaying) return

    this.pauseTime = this.ctx.currentTime - this.startTime
    this.isPlaying = false

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    // Stop all active nodes
    const now = this.ctx.currentTime
    this.activeNodes.forEach(({ osc, gain }) => {
      gain.gain.cancelScheduledValues(now)
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.05)
      osc.stop(now + 0.1)
    })
    this.activeNodes = []
  }

  /**
   * Stop playback completely
   */
  stop(): void {
    this.pause()
    this.pauseTime = 0
    this.scheduledEvents = []
    this.lastScheduledLoop = -1
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (!this.ctx) return 0
    if (this.isPlaying) {
      return this.ctx.currentTime - this.startTime
    }
    return this.pauseTime
  }

  /**
   * Play a single chord (for preview)
   */
  playChord(notes: NoteToPlay[]): void {
    const ctx = this.ensureContext()

    // Stop any active notes
    const now = ctx.currentTime
    this.activeNodes.forEach(({ osc, gain }) => {
      gain.gain.cancelScheduledValues(now)
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.05)
      osc.stop(now + 0.1)
    })
    this.activeNodes = []

    this.scheduleChord(notes, now + 0.05, 1.5)
  }

  /**
   * Play a single note (for preview)
   */
  playNote(note: NoteToPlay): void {
    const ctx = this.ensureContext()
    this.scheduleRiffNote(note, ctx.currentTime + 0.02, 0.5)
  }
}
