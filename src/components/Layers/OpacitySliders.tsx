import { useMapStore } from '@/stores/mapStore.ts'
import styles from './Layers.module.css'

interface SliderDef {
  label: string
  value: number
  onChange: (v: number) => void
}

function OpacitySlider({ label, value, onChange }: SliderDef) {
  return (
    <div className={styles.opacitySlider}>
      <div className={styles.opacityHeader}>
        <span className={styles.opacityLabel}>{label}</span>
        <span className={styles.opacityValue}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.slider}
        aria-label={`${label} opacity`}
      />
    </div>
  )
}

export function OpacitySliders() {
  const {
    hubOpacity, infraOpacity, boundaryOpacity,
    setHubOpacity, setInfraOpacity, setBoundaryOpacity,
  } = useMapStore()

  return (
    <div>
      <div className={styles.sectionTitle}>Opacity</div>
      <OpacitySlider label="Hubs" value={hubOpacity} onChange={setHubOpacity} />
      <OpacitySlider label="Infrastructure" value={infraOpacity} onChange={setInfraOpacity} />
      <OpacitySlider label="Boundaries" value={boundaryOpacity} onChange={setBoundaryOpacity} />
    </div>
  )
}
