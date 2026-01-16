import { useMemo, useState } from 'react'
import type { GuitarString, NoteId } from '../types/music'
import type { StringState, TuningDefinition } from '../types/analyzer'
import { TUNING_PRESETS, TUNING_LIST } from '../data/tunings'
import { NOTE_TO_INDEX, INDEX_TO_NOTE } from '../data/notes'
import { analyzeChord } from '../utils/chordAnalyzer'
import { InteractiveFretboard } from './InteractiveFretboard'

const STRINGS: GuitarString[] = [6, 5, 4, 3, 2, 1]

export function ChordAnalyzer() {
  const [tuning, setTuning] = useState<TuningDefinition>(TUNING_PRESETS.standard)
  const [stringStates, setStringStates] = useState<Record<GuitarString, StringState>>({
    6: 'muted',
    5: 'muted',
    4: 'muted',
    3: 'muted',
    2: 'muted',
    1: 'muted'
  })

  const handleStringStateChange = (string: GuitarString, state: StringState) => {
    setStringStates((prev) => ({
      ...prev,
      [string]: state
    }))
  }

  const handleTuningChange = (tuningId: string) => {
    const newTuning = TUNING_LIST.find((t) => t.id === tuningId)
    if (newTuning) {
      setTuning(newTuning)
    }
  }

  const handleClear = () => {
    setStringStates({
      6: 'muted',
      5: 'muted',
      4: 'muted',
      3: 'muted',
      2: 'muted',
      1: 'muted'
    })
  }

  // Calculate notes from string states
  const selectedNotes = useMemo(() => {
    const notes: NoteId[] = []

    STRINGS.forEach((stringNum, index) => {
      const state = stringStates[stringNum]

      if (state === 'muted') return

      const openNote = tuning.notes[index]
      const openSemitone = NOTE_TO_INDEX[openNote]

      if (state === 'open') {
        notes.push(openNote)
      } else if (typeof state === 'number') {
        const targetSemitone = (openSemitone + state) % 12
        const note = INDEX_TO_NOTE[targetSemitone]
        notes.push(note)
      }
    })

    return notes
  }, [stringStates, tuning])

  // Analyze the chord
  const analysis = useMemo(() => {
    return analyzeChord(selectedNotes)
  }, [selectedNotes])

  const hasNotes = analysis.noteCount > 0

  return (
    <section className="chord-analyzer-section">
      <h2 className="analyzer-title">Chord Analyzer</h2>
      <p className="analyzer-subtitle">Click the fretboard to select notes and identify the chord</p>

      <div className="analyzer-content">
        {/* Controls */}
        <div className="analyzer-controls">
          <div className="analyzer-control-group">
            <label className="analyzer-label">Tuning:</label>
            <select
              className="analyzer-select"
              value={tuning.id}
              onChange={(e) => handleTuningChange(e.target.value)}
            >
              {TUNING_LIST.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" onClick={handleClear}>
            Clear All
          </button>
        </div>

        {/* Interactive Fretboard */}
        <InteractiveFretboard
          tuning={tuning}
          stringStates={stringStates}
          onStringStateChange={handleStringStateChange}
        />

        {/* Analysis Results */}
        <div className="analyzer-results">
          {!hasNotes && (
            <div className="analyzer-empty-state">
              <p>Click on the fretboard to select notes</p>
              <ul className="analyzer-instructions">
                <li>Click on frets to select notes (shows note name)</li>
                <li>Click the left edge to mark string as open (O)</li>
                <li>Click a selected note again to deselect it (shows X)</li>
                <li>Click X to cycle back to open or select a different fret</li>
                <li>Select at least 2 notes to identify a chord</li>
              </ul>
            </div>
          )}

          {hasNotes && (
            <>
              <div className="analyzer-notes-display">
                <h3 className="analyzer-section-title">Selected Notes:</h3>
                <div className="analyzer-note-badges">
                  {analysis.uniqueNotes.map((note, index) => (
                    <span key={index} className="analyzer-note-badge">
                      {note}
                    </span>
                  ))}
                </div>
              </div>

              {analysis.possibleChords.length > 0 && (
                <div className="analyzer-chord-results">
                  <h3 className="analyzer-section-title">
                    {analysis.possibleChords.length === 1
                      ? 'Identified Chord:'
                      : 'Possible Chords:'}
                  </h3>

                  <div className="analyzer-chord-list">
                    {analysis.possibleChords.slice(0, 5).map((chord, index) => (
                      <div
                        key={index}
                        className={`analyzer-chord-card ${index === 0 ? 'primary' : ''}`}
                      >
                        <div className="chord-card-header">
                          <h4 className="chord-card-name">{chord.fullName}</h4>
                          {chord.confidence > 0 && (
                            <span className="chord-card-confidence">
                              {chord.confidence}% match
                            </span>
                          )}
                        </div>

                        {chord.explanation && (
                          <p className="chord-card-explanation">{chord.explanation}</p>
                        )}

                        <div className="chord-card-intervals">
                          <span className="chord-card-label">Intervals:</span>
                          {chord.intervals.map((interval, i) => (
                            <span key={i} className="chord-interval-badge">
                              {interval}
                            </span>
                          ))}
                        </div>

                        {chord.bassNote && chord.bassNote !== chord.root && (
                          <p className="chord-card-bass">
                            Bass note: <strong>{chord.bassNote}</strong>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
