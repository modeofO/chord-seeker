import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { GuitarString, NoteId } from '../types/music'
import type { ChordProgression, AnimationSpeed } from '../types/progression'
import type { ProgressionRiff, RiffStyle, TabSheet, Track, TrackType } from '../types/songBuilder'
import { TabDisplay } from './TabDisplay'
import { generateProgressionRiff, getAvailableNotesAtPosition, addRiffNote, removeRiffNote } from '../utils/riffGenerator'
import { riffToTabSheet } from '../utils/tabFormatter'
import { SongAudioEngine } from '../audio/songEngine'
import { SPEED_TO_BPM, TRACK_COLORS } from '../types/songBuilder'
import { QUALITY_MAP } from '../data/chordQualities'
import { exportRiffToMidi, exportChordsToMidi, downloadMidi, generateMidiFilename, exportTracksToMidi } from '../utils/midiExport'

interface Props {
  isOpen: boolean
  onClose: () => void
  progression: ChordProgression | null
  rootNote: NoteId
  speed: AnimationSpeed
}

const RIFF_STYLES: { id: RiffStyle; label: string; description: string }[] = [
  { id: 'melodic', label: 'Melodic', description: 'Single-note lines with passing tones' },
  { id: 'arpeggiated', label: 'Arpeggiated', description: 'Broken chord patterns' },
  { id: 'bass-driven', label: 'Bass-Driven', description: 'Root-focused low-end patterns' },
  { id: 'complex', label: 'Complex', description: 'Advanced techniques: slides, bends, hammer-ons, harmonics' }
]

export function SongBuilderPanel({ isOpen, onClose, progression, rootNote, speed }: Props) {
  const [riffStyle, setRiffStyle] = useState<RiffStyle>('melodic')
  const [riff, setRiff] = useState<ProgressionRiff | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMeasure, setCurrentMeasure] = useState(0)
  const [currentSubdivision, setCurrentSubdivision] = useState(0)
  const [customBpm, setCustomBpm] = useState<number>(SPEED_TO_BPM[speed])
  const [bpmInputValue, setBpmInputValue] = useState<string>(String(SPEED_TO_BPM[speed]))
  const [editingPosition, setEditingPosition] = useState<{
    measureIndex: number
    subdivisionIndex: number
    stringId: GuitarString
  } | null>(null)

  // Track state
  const [tracks, setTracks] = useState<Track[]>([])
  const [playbackSource, setPlaybackSource] = useState<'preview' | 'tracks'>('preview')
  const playbackSourceRef = useRef<'preview' | 'tracks'>('preview')

  const audioEngineRef = useRef<SongAudioEngine | null>(null)

  // Initialize audio engine
  useEffect(() => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new SongAudioEngine()
    }

    // Set up beat callback
    audioEngineRef.current.onBeat((measure, subdivision) => {
      setCurrentMeasure(measure)
      setCurrentSubdivision(subdivision)
    })

    return () => {
      audioEngineRef.current?.stop()
    }
  }, [])

  // Sync customBpm with speed when speed prop changes
  useEffect(() => {
    setCustomBpm(SPEED_TO_BPM[speed])
    setBpmInputValue(String(SPEED_TO_BPM[speed]))
  }, [speed])

  // Sync bpmInputValue when customBpm changes (e.g., from slider)
  useEffect(() => {
    setBpmInputValue(String(customBpm))
  }, [customBpm])

  // Handle BPM input change (while typing - no validation yet)
  const handleBpmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpmInputValue(e.target.value)
  }

  // Apply BPM when input loses focus or Enter is pressed
  const applyBpmFromInput = () => {
    const value = parseInt(bpmInputValue, 10)
    if (!isNaN(value)) {
      const clampedValue = Math.max(60, Math.min(240, value))
      setCustomBpm(clampedValue)
      setBpmInputValue(String(clampedValue))
    } else {
      // Reset to current BPM if invalid
      setBpmInputValue(String(customBpm))
    }
  }

  const handleBpmKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyBpmFromInput()
      ;(e.target as HTMLInputElement).blur()
    }
  }

  // Generate riff when progression, root, or style changes
  useEffect(() => {
    if (progression && isOpen) {
      const newRiff = generateProgressionRiff(progression, rootNote, riffStyle, customBpm)
      setRiff(newRiff)
      setCurrentMeasure(0)
      setCurrentSubdivision(0)
      setIsPlaying(false)
      audioEngineRef.current?.stop()
    }
  }, [progression, rootNote, riffStyle, customBpm, isOpen])

  // Convert riff to tab sheet
  const tabSheet = useMemo<TabSheet | null>(() => {
    if (!riff) return null
    return riffToTabSheet(riff)
  }, [riff])

  // Handle regenerate
  const handleRegenerate = () => {
    if (!progression) return
    const newRiff = generateProgressionRiff(progression, rootNote, riffStyle, customBpm)
    setRiff(newRiff)
    setCurrentMeasure(0)
    setCurrentSubdivision(0)

    if (isPlaying) {
      audioEngineRef.current?.stop()
      setIsPlaying(false)
    }
  }

  // Handle play/pause
  const handlePlayPause = () => {
    if (!riff || !tabSheet || !audioEngineRef.current) return

    if (isPlaying) {
      audioEngineRef.current.pause()
      setIsPlaying(false)
    } else {
      // Use ref for immediate access to playback source (state might be stale)
      if (playbackSourceRef.current === 'tracks' && tracks.length > 0) {
        audioEngineRef.current.playAllTracks(tracks, tabSheet, customBpm)
      } else {
        audioEngineRef.current.play(riff, tabSheet)
      }
      setIsPlaying(true)
    }
  }

  // Update playback source (both state for UI and ref for immediate access)
  const updatePlaybackSource = (source: 'preview' | 'tracks') => {
    setPlaybackSource(source)
    playbackSourceRef.current = source
    if (isPlaying) {
      handleStop()
    }
  }

  // Handle stop
  const handleStop = () => {
    audioEngineRef.current?.stop()
    setIsPlaying(false)
    setCurrentMeasure(0)
    setCurrentSubdivision(0)
  }

  // Handle note click for editing
  const handleNoteClick = useCallback(
    (measureIndex: number, subdivisionIndex: number, stringId: GuitarString) => {
      if (!riff || !tabSheet) return

      const currentFret = tabSheet.measures[measureIndex]?.positions[stringId]?.[subdivisionIndex]

      if (currentFret !== null) {
        // Note exists - remove it
        const updatedRiff = removeRiffNote(
          riff,
          measureIndex,
          riff.chordRiffs[measureIndex].notes.find(
            (n) =>
              n.string === stringId &&
              Math.floor(n.startBeat * 2) === subdivisionIndex // Assuming 8 subdivisions for 4 beats
          )?.id || ''
        )
        setRiff(updatedRiff)
      } else {
        // No note - open picker
        setEditingPosition({ measureIndex, subdivisionIndex, stringId })
      }
    },
    [riff, tabSheet]
  )

  // Get available notes for current editing position
  const availableNotes = useMemo(() => {
    if (!editingPosition || !riff) return []

    const chordRiff = riff.chordRiffs[editingPosition.measureIndex]
    if (!chordRiff) return []

    return getAvailableNotesAtPosition(
      chordRiff.chordRoot,
      chordRiff.chordQuality,
      editingPosition.stringId
    )
  }, [editingPosition, riff])

  // Handle note selection from picker
  const handleNoteSelect = (note: { note: NoteId; fret: number }) => {
    if (!editingPosition || !riff) return

    const startBeat = editingPosition.subdivisionIndex / 2 // Convert subdivision to beat
    const updatedRiff = addRiffNote(
      riff,
      editingPosition.measureIndex,
      editingPosition.stringId,
      note.fret,
      startBeat,
      note.note
    )

    setRiff(updatedRiff)
    setEditingPosition(null)

    // Play the note for feedback
    audioEngineRef.current?.playNote({ string: editingPosition.stringId, fret: note.fret })
  }

  // Close panel and stop audio
  const handleClose = () => {
    audioEngineRef.current?.stop()
    setIsPlaying(false)
    onClose()
  }

  // Export riff as MIDI
  const handleExportRiff = () => {
    if (!riff) return
    const midiData = exportRiffToMidi(riff)
    const filename = generateMidiFilename(riff, 'riff')
    downloadMidi(midiData, filename)
  }

  // Export chords as MIDI
  const handleExportChords = () => {
    if (!riff) return
    const midiData = exportChordsToMidi(riff)
    const filename = generateMidiFilename(riff, 'chords')
    downloadMidi(midiData, filename)
  }

  // Export all tracks as MIDI
  const handleExportAllTracks = () => {
    if (tracks.length === 0) return
    const midiData = exportTracksToMidi(tracks, customBpm)
    const filename = `tracks-${customBpm}bpm.mid`
    downloadMidi(midiData, filename)
  }

  // Add current riff to a new track
  const handleAddToTrack = (type: TrackType) => {
    if (!riff) return

    const newTrack: Track = {
      id: `track-${Date.now()}`,
      name: `${type === 'riff' ? 'Riff' : 'Chords'} ${tracks.length + 1}`,
      type,
      riff: JSON.parse(JSON.stringify(riff)), // Deep copy
      volume: 0.7,
      isMuted: false,
      isSoloed: false,
      color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
    }

    setTracks([...tracks, newTrack])

    // Create audio node for new track
    audioEngineRef.current?.createTrackAudio(newTrack.id, newTrack.volume)
  }

  // Remove a track
  const handleRemoveTrack = (trackId: string) => {
    setTracks(tracks.filter(t => t.id !== trackId))
    audioEngineRef.current?.removeTrackAudio(trackId)
  }

  // Toggle track mute
  const handleToggleMute = (trackId: string) => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        const newMuted = !t.isMuted
        audioEngineRef.current?.setTrackMuted(trackId, newMuted)
        return { ...t, isMuted: newMuted }
      }
      return t
    }))
  }

  // Toggle track solo
  const handleToggleSolo = (trackId: string) => {
    const newTracks = tracks.map(t =>
      t.id === trackId ? { ...t, isSoloed: !t.isSoloed } : t
    )
    setTracks(newTracks)
    audioEngineRef.current?.updateSoloState(newTracks)
  }

  // Update track volume
  const handleTrackVolumeChange = (trackId: string, volume: number) => {
    setTracks(tracks.map(t =>
      t.id === trackId ? { ...t, volume } : t
    ))
    audioEngineRef.current?.setTrackVolume(trackId, volume)
  }

  // Get current chord info
  const currentChordInfo = useMemo(() => {
    if (!riff || currentMeasure >= riff.chordRiffs.length) return null
    const chordRiff = riff.chordRiffs[currentMeasure]
    const qualityDef = QUALITY_MAP[chordRiff.chordQuality]
    return {
      name: `${chordRiff.chordRoot}${qualityDef?.shortLabel || ''}`,
      degree: chordRiff.chordDegree
    }
  }, [riff, currentMeasure])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="song-builder-backdrop" onClick={handleClose} />

      {/* Panel */}
      <div className={`song-builder-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="song-builder-header">
          <h2 className="song-builder-title">Song Builder</h2>
          <button className="btn btn-icon" onClick={handleClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="song-builder-content">
          {!progression ? (
            <div className="song-builder-empty">
              <p>Select a chord progression to get started</p>
            </div>
          ) : (
            <>
              {/* Current chord indicator */}
              {currentChordInfo && (
                <div className="song-builder-current-chord">
                  <span className="current-chord-label">Now Playing:</span>
                  <span className="current-chord-name">{currentChordInfo.name}</span>
                  <span className="current-chord-degree">({currentChordInfo.degree})</span>
                </div>
              )}

              {/* Style selector */}
              <div className="song-builder-controls">
                <div className="style-selector">
                  <label className="style-label">Riff Style:</label>
                  <div className="btn-group btn-group-tight" style={{ flexWrap: 'wrap' }}>
                    {RIFF_STYLES.map((style) => (
                      <button
                        key={style.id}
                        className={`btn btn-secondary btn-sm ${riffStyle === style.id ? 'active' : ''}`}
                        onClick={() => setRiffStyle(style.id)}
                        title={style.description}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary" onClick={handleRegenerate}>
                  Regenerate
                </button>
              </div>

              {/* Tab display */}
              {tabSheet && (
                <div className="song-builder-tab-section">
                  <h3 className="tab-section-title">Guitar Tab</h3>
                  <p className="tab-section-hint">Click on positions to add or remove notes</p>
                  <TabDisplay
                    tabSheet={tabSheet}
                    currentMeasure={playbackSourceRef.current === 'tracks' && isPlaying ? -1 : currentMeasure}
                    currentSubdivision={playbackSourceRef.current === 'tracks' && isPlaying ? -1 : currentSubdivision}
                    onNoteClick={handleNoteClick}
                  />
                </div>
              )}

              {/* Note picker popup */}
              {editingPosition && (
                <div className="note-picker-overlay" onClick={() => setEditingPosition(null)}>
                  <div className="note-picker" onClick={(e) => e.stopPropagation()}>
                    <h4 className="note-picker-title">Select Note</h4>
                    <div className="note-picker-options">
                      {availableNotes.map((note) => (
                        <button
                          key={`${note.note}-${note.fret}`}
                          className={`btn btn-secondary note-picker-btn ${note.interval ? 'chord-tone' : ''}`}
                          onClick={() => handleNoteSelect(note)}
                        >
                          <span className="note-picker-note">{note.note}</span>
                          <span className="note-picker-fret">fret {note.fret}</span>
                          {note.interval && (
                            <span className="note-picker-interval">{note.interval}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      className="btn btn-ghost"
                      style={{ width: '100%' }}
                      onClick={() => setEditingPosition(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Add to track buttons */}
              <div className="add-track-buttons">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleAddToTrack('riff')}
                  disabled={!riff}
                  title="Add current riff as a new track"
                >
                  + Add Riff Track
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleAddToTrack('chord')}
                  disabled={!riff}
                  title="Add current chords as a new track"
                >
                  + Add Chord Track
                </button>
              </div>

              {/* Track list */}
              {tracks.length > 0 && (
                <div className="track-list">
                  <h3 className="track-list-title">Tracks</h3>
                  {tracks.map((track) => (
                    <div
                      key={track.id}
                      className={`track-lane ${track.isMuted ? 'muted' : ''}`}
                    >
                      <div
                        className="track-color-bar"
                        style={{ backgroundColor: track.color }}
                      />
                      <div className="track-info">
                        <span className="track-name">{track.name}</span>
                        <span className={`track-type-badge ${track.type}`}>
                          {track.type === 'riff' ? 'Riff' : 'Chords'}
                        </span>
                      </div>
                      <div className="track-controls">
                        <button
                          className={`btn btn-xs track-btn-mute ${track.isMuted ? 'active' : ''}`}
                          onClick={() => handleToggleMute(track.id)}
                          title={track.isMuted ? 'Unmute' : 'Mute'}
                        >
                          M
                        </button>
                        <button
                          className={`btn btn-xs track-btn-solo ${track.isSoloed ? 'active' : ''}`}
                          onClick={() => handleToggleSolo(track.id)}
                          title={track.isSoloed ? 'Unsolo' : 'Solo'}
                        >
                          S
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={track.volume}
                          onChange={(e) => handleTrackVolumeChange(track.id, Number(e.target.value))}
                          className="track-volume-slider"
                          title={`Volume: ${Math.round(track.volume * 100)}%`}
                        />
                        <button
                          className="btn btn-xs btn-ghost track-btn-delete"
                          onClick={() => handleRemoveTrack(track.id)}
                          title="Remove track"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom controls wrapper */}
              <div className="song-builder-bottom-controls">
              {/* Playback source toggle */}
              {tracks.length > 0 && (
                <div className="playback-source-toggle">
                  <span className="playback-source-label">Output:</span>
                  <div className="btn-group btn-group-tight">
                    <button
                      className={`btn btn-sm ${playbackSource === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updatePlaybackSource('preview')}
                    >
                      Preview
                    </button>
                    <button
                      className={`btn btn-sm ${playbackSource === 'tracks' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updatePlaybackSource('tracks')}
                    >
                      Tracks ({tracks.length})
                    </button>
                  </div>
                </div>
              )}

              {/* Playback controls */}
              <div className="song-builder-playback">
                <div className="btn-group">
                  <button className="btn btn-icon" onClick={handleStop} title="Stop">
                    <span className="stop-icon" />
                  </button>
                  <button
                    className="btn btn-icon btn-primary"
                    onClick={handlePlayPause}
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <span className="pause-icon" />
                    ) : (
                      <span className="play-icon" />
                    )}
                  </button>
                </div>

                <div className="bpm-control">
                  <label className="bpm-label">BPM:</label>
                  <input
                    type="range"
                    min="60"
                    max="240"
                    step="5"
                    value={customBpm}
                    onChange={(e) => setCustomBpm(Number(e.target.value))}
                    className="bpm-slider"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={bpmInputValue}
                    onChange={handleBpmInputChange}
                    onBlur={applyBpmFromInput}
                    onKeyDown={handleBpmKeyDown}
                    className="bpm-input"
                  />
                </div>

                <div className="playback-info">
                  <span className="measure-display">
                    Measure {currentMeasure + 1} / {tabSheet?.measures.length || 0}
                  </span>
                </div>
              </div>

              {/* Export section */}
              <div className="song-builder-export">
                <span className="export-label">Export MIDI:</span>
                <div className="btn-group">
                  {tracks.length > 0 && (
                    <button className="btn btn-primary" onClick={handleExportAllTracks} title="Download all tracks as MIDI file">
                      All Tracks
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={handleExportRiff} title="Download riff as MIDI file">
                    <span className="export-icon">♪</span>
                    Riff
                  </button>
                  <button className="btn btn-secondary" onClick={handleExportChords} title="Download chords as MIDI file">
                    <span className="export-icon">♫</span>
                    Chords
                  </button>
                </div>
              </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
