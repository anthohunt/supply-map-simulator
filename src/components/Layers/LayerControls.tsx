import { HubTierToggles } from './HubTierToggles.tsx'
import styles from './Layers.module.css'

export function LayerControls() {
  return (
    <div className={styles.container}>
      <HubTierToggles />
    </div>
  )
}
