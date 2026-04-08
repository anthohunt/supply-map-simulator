import { HubTierToggles } from './HubTierToggles.tsx'
import styles from './Layers.module.css'

export function LayerControls() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Network Explorer</h2>
      <p className={styles.explorerHint}>
        Click any hub on the map to see its connections and freight details.
        Toggle tiers below to filter the view.
      </p>
      <div className={styles.divider} />
      <HubTierToggles />
    </div>
  )
}
