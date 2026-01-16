import { useEffect, useState, useRef } from 'react'
import type { ChordQuality, NoteId } from '../types/music'
import type { AnimationSpeed, AnimationState, ChordProgression } from '../types/progression'
import { PROGRESSION_LIST, getProgressionsForQuality } from '../data/progressions'
import { transposeProgression } from '../utils/scaleUtils'
import { ChordAudioEngine } from '../audio/engine'
import { buildChordShapes } from '../utils/chordUtils'

interface Props {
  root: NoteId
  quality: ChordQuality
  onChordChange?: (chordIndex: number, chordRoot: NoteId, chordQuality: ChordQuality) => void
  onSongBuilderOpen?: (progression: ChordProgression, speed: AnimationSpeed) => void
}

const SPEED_INTERVALS: Record<AnimationSpeed, number> = {
  slow: 2000,
  medium: 1500,
  fast: 1000
}

export function ProgressionViewer({ root, quality, onChordChange, onSongBuilderOpen }: Props) {
  const [selectedProgression, setSelectedProgression] = useState<ChordProgression | null>(null)
  const [currentChordIndex, setCurrentChordIndex] = useState(0)
  const [animationState, setAnimationState] = useState<AnimationState>('paused')
  const [speed, setSpeed] = useState<AnimationSpeed>('medium')
  const [audioEnabled, setAudioEnabled] = useState(false)

  const audioEngineRef = useRef<ChordAudioEngine | null>(null)

  // Initialize audio engine
  useEffect(() => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new ChordAudioEngine()
    }
    return () => {
      audioEngineRef.current?.stop()
    }
  }, [])

  // Get progressions compatible with the current quality
  const compatibleProgressions = getProgressionsForQuality(quality)

  // Set default progression when quality changes
  useEffect(() => {
    if (compatibleProgressions.length > 0 && !selectedProgression) {
      setSelectedProgression(compatibleProgressions[0])
    }
  }, [compatibleProgressions, selectedProgression])

  // Reset when root or quality changes
  useEffect(() => {
    setCurrentChordIndex(0)
    setAnimationState('paused')
    // Find a compatible progression if current one isn't compatible
    if (selectedProgression) {
      const isCompatible = compatibleProgressions.some((p) => p.id === selectedProgression.id)
      if (!isCompatible && compatibleProgressions.length > 0) {
        setSelectedProgression(compatibleProgressions[0])
      }
    }
  }, [root, quality])

  // Auto-advance timer
  useEffect(() => {
    if (animationState !== 'playing' || !selectedProgression) {
      return
    }

    const interval = setInterval(() => {
      setCurrentChordIndex((prev) => {
        const next = (prev + 1) % selectedProgression.chords.length
        return next
      })
    }, SPEED_INTERVALS[speed])

    return () => clearInterval(interval)
  }, [animationState, speed, selectedProgression])

  // Notify parent of chord changes and play audio if enabled
  useEffect(() => {
    if (!selectedProgression) return

    const transposed = transposeProgression(selectedProgression, root)
    const currentChord = transposed[currentChordIndex]
    if (currentChord) {
      // Notify parent
      if (onChordChange) {
        onChordChange(currentChordIndex, currentChord.note, currentChord.quality)
      }

      // Play audio if enabled
      if (audioEnabled && audioEngineRef.current) {
        const shapes = buildChordShapes(currentChord.note, currentChord.quality)
        if (shapes.length > 0 && shapes[0].notesForAudio) {
          audioEngineRef.current.play(shapes[0].notesForAudio)
        }
      }
    }
  }, [currentChordIndex, selectedProgression, root, onChordChange, audioEnabled])

  if (compatibleProgressions.length === 0) {
    return (
      <section className="progression-viewer">
        <h2 className="progression-title">Chord Progressions</h2>
        <p className="progression-empty">No progressions available for this chord quality</p>
      </section>
    )
  }

  const transposedChords = selectedProgression
    ? transposeProgression(selectedProgression, root)
    : []

  const handleProgressionChange = (progressionId: string) => {
    const progression = PROGRESSION_LIST.find((p) => p.id === progressionId)
    if (progression) {
      setSelectedProgression(progression)
      setCurrentChordIndex(0)
      setAnimationState('paused')
    }
  }

  const handlePrevious = () => {
    if (selectedProgression) {
      setCurrentChordIndex((prev) => (prev - 1 + selectedProgression.chords.length) % selectedProgression.chords.length)
    }
  }

  const handleNext = () => {
    if (selectedProgression) {
      setCurrentChordIndex((prev) => (prev + 1) % selectedProgression.chords.length)
    }
  }

  const handlePlayPause = () => {
    setAnimationState((prev) => (prev === 'playing' ? 'paused' : 'playing'))
  }

  return (
    <section className="progression-viewer">
      <h2 className="progression-title">Chord Progressions</h2>
      <p className="progression-subtitle">Popular progressions in {root} {quality}</p>

      {/* Progression Selector */}
      <div className="progression-selector">
        <label className="progression-label">Select Progression:</label>
        <select
          className="progression-select"
          value={selectedProgression?.id || ''}
          onChange={(e) => handleProgressionChange(e.target.value)}
        >
          {compatibleProgressions.map((prog) => (
            <option key={prog.id} value={prog.id}>
              {prog.name} - {prog.description}
            </option>
          ))}
        </select>
      </div>

      {selectedProgression && (
        <>
          {/* Chord Display */}
          <div className="progression-chords">
            {transposedChords.map((chord, index) => (
              <button
                key={index}
                className={`progression-chord-card ${index === currentChordIndex ? 'active' : ''}`}
                onClick={() => setCurrentChordIndex(index)}
              >
                <div className="chord-degree">{chord.degree}</div>
                <div className="chord-name">
                  {chord.note} {chord.quality}
                </div>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="controls-panel">
            <div className="btn-group" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={handlePrevious}>
                Previous
              </button>
              <button className="btn btn-primary" onClick={handlePlayPause}>
                {animationState === 'playing' ? 'Pause' : 'Play'}
              </button>
              <button className="btn btn-secondary" onClick={handleNext}>
                Next
              </button>
              <button
                className={`btn btn-icon ${audioEnabled ? 'active' : ''}`}
                onClick={() => setAudioEnabled(!audioEnabled)}
                title={audioEnabled ? 'Mute audio' : 'Enable audio'}
                aria-label={audioEnabled ? 'Mute audio' : 'Enable audio'}
              >
                <span className="audio-icon">{audioEnabled ? '🔊' : '🔇'}</span>
              </button>
            </div>

            <div className="speed-section">
              <label className="speed-label">Speed:</label>
              <div className="btn-group btn-group-tight">
                {(['slow', 'medium', 'fast'] as AnimationSpeed[]).map((s) => (
                  <button
                    key={s}
                    className={`btn btn-secondary btn-sm ${speed === s ? 'active' : ''}`}
                    onClick={() => setSpeed(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {onSongBuilderOpen && (
              <button
                className="btn btn-accent btn-full"
                onClick={() => onSongBuilderOpen(selectedProgression!, speed)}
              >
                Song Builder
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
