import { useTerritoryStore } from '@/stores/territoryStore.ts'
import { TerritoryInput } from '@/components/TerritoryInput/TerritoryInput.tsx'
import { DataPipelineDashboard } from '@/components/DataPipeline/DataPipelineDashboard.tsx'
import { PixelizationControls } from '@/components/Pixelization/PixelizationControls.tsx'
import styles from './Sidebar.module.css'

interface SidebarProps {
  onHoverSite?: (siteId: string | null) => void
}

export function Sidebar({ onHoverSite }: SidebarProps) {
  const { currentScreen } = useTerritoryStore()

  return (
    <aside className={styles.sidebar} role="complementary" aria-label="Control sidebar">
      <div className={styles.header}>
        <h1 className={styles.logo}>Supply Map</h1>
      </div>
      <div className={styles.content}>
        {currentScreen === 'territory-search' && <TerritoryInput />}
        {currentScreen === 'data-pipeline' && <DataPipelineDashboard onHoverSite={onHoverSite} />}
        {currentScreen === 'pixelization' && <PixelizationControls />}
      </div>
    </aside>
  )
}
