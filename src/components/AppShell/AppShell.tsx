import { useState, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar/Sidebar.tsx'
import { MapView } from '@/components/Map/MapView.tsx'
import { HubDetailPanel } from '@/components/HubDetail/HubDetailPanel.tsx'
import { ExportModal } from '@/components/Export/ExportModal.tsx'
import { useExport } from '@/hooks/useExport.ts'
import styles from './AppShell.module.css'

export function AppShell() {
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null)
  const exportState = useExport()

  const handleHoverSite = useCallback((siteId: string | null) => {
    setHoveredSiteId(siteId)
  }, [])

  return (
    <div className={styles.shell}>
      <Sidebar onHoverSite={handleHoverSite} onExportClick={exportState.open} />
      <main className={styles.main}>
        <MapView hoveredSiteId={hoveredSiteId} />
        <HubDetailPanel />
      </main>
      <ExportModal
        isOpen={exportState.isOpen}
        activeTab={exportState.activeTab}
        onTabChange={exportState.setActiveTab}
        onClose={exportState.close}
      />
    </div>
  )
}
