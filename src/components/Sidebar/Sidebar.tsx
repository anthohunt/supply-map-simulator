import { useTerritoryStore } from '@/stores/territoryStore.ts'
import { TerritoryInput } from '@/components/TerritoryInput/TerritoryInput.tsx'
import { DataPipelineDashboard } from '@/components/DataPipeline/DataPipelineDashboard.tsx'
import styles from './Sidebar.module.css'

export function Sidebar() {
  const { currentScreen } = useTerritoryStore()

  return (
    <aside className={styles.sidebar} role="complementary" aria-label="Control sidebar">
      <div className={styles.header}>
        <h1 className={styles.logo}>Supply Map</h1>
      </div>
      <div className={styles.content}>
        {currentScreen === 'territory-search' && <TerritoryInput />}
        {currentScreen === 'data-pipeline' && <DataPipelineDashboard />}
      </div>
    </aside>
  )
}
