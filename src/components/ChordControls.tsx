import type { ChordQuality, ChordQualityDefinition, NoteId, NoteOption } from '../types/music'

interface Props {
  root: NoteId
  quality: ChordQuality
  noteOptions: NoteOption[]
  chordQualities: ChordQualityDefinition[]
  onRootChange: (note: NoteId) => void
  onQualityChange: (quality: ChordQuality) => void
}

export function ChordControls({
  root,
  quality,
  noteOptions,
  chordQualities,
  onRootChange,
  onQualityChange
}: Props) {
  const currentRootIndex = noteOptions.findIndex((n) => n.id === root)
  const currentQualityIndex = chordQualities.findIndex((q) => q.id === quality)

  const handleNextRoot = () => {
    const nextIndex = (currentRootIndex + 1) % noteOptions.length
    onRootChange(noteOptions[nextIndex].id)
  }

  const handlePrevRoot = () => {
    const prevIndex = (currentRootIndex - 1 + noteOptions.length) % noteOptions.length
    onRootChange(noteOptions[prevIndex].id)
  }

  const handleNextQuality = () => {
    const nextIndex = (currentQualityIndex + 1) % chordQualities.length
    onQualityChange(chordQualities[nextIndex].id)
  }

  const handlePrevQuality = () => {
    const prevIndex = (currentQualityIndex - 1 + chordQualities.length) % chordQualities.length
    onQualityChange(chordQualities[prevIndex].id)
  }

  return (
    <section className="control-panel">
      <div className="control">
        <label htmlFor="root-select">Root note</label>
        <div className="control-row">
          <button
            type="button"
            className="btn btn-icon"
            onClick={handlePrevRoot}
            aria-label="Previous root note"
          >
            ‹
          </button>
          <select
            id="root-select"
            value={root}
            onChange={(event) => onRootChange(event.target.value as NoteId)}
          >
            {noteOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-icon"
            onClick={handleNextRoot}
            aria-label="Next root note"
          >
            ›
          </button>
        </div>
      </div>
      <div className="control">
        <label htmlFor="quality-select">Chord quality</label>
        <div className="control-row">
          <button
            type="button"
            className="btn btn-icon"
            onClick={handlePrevQuality}
            aria-label="Previous chord quality"
          >
            ‹
          </button>
          <select
            id="quality-select"
            value={quality}
            onChange={(event) => onQualityChange(event.target.value as ChordQuality)}
          >
            {chordQualities.map((qualityDef) => (
              <option key={qualityDef.id} value={qualityDef.id}>
                {qualityDef.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-icon"
            onClick={handleNextQuality}
            aria-label="Next chord quality"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  )
}
