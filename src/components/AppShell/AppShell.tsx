import { useState, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar/Sidebar.tsx'
import { MapView } from '@/components/Map/MapView.tsx'
import { HubDetailPanel } from '@/components/HubDetail/HubDetailPanel.tsx'
import styles from './AppShell.module.css'

export function AppShell() {
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null)

  const handleHoverSite = useCallback((siteId: string | null) => {
    setHoveredSiteId(siteId)
  }, [])

  return (
    <div className={styles.shell}>
      <Sidebar onHoverSite={handleHoverSite} />
      <main className={styles.main}>
        <MapView hoveredSiteId={hoveredSiteId} />
        <HubDetailPanel />
      </main>
    </div>
  )
}
