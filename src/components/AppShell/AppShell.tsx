import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar/Sidebar.tsx'
import { MapView } from '@/components/Map/MapView.tsx'
import { HubDetailPanel } from '@/components/HubDetail/HubDetailPanel.tsx'
import { ExportModal } from '@/components/Export/ExportModal.tsx'
import { useExport } from '@/hooks/useExport.ts'
import styles from './AppShell.module.css'

export function AppShell() {
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null)
  const exportState = useExport()
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)
  const [sidebarVisible, setSidebarVisible] = useState(!isMobile)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 640
      setIsMobile(mobile)
      if (!mobile) setSidebarVisible(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleHoverSite = useCallback((siteId: string | null) => {
    setHoveredSiteId(siteId)
  }, [])

  return (
    <div className={styles.shell}>
      {isMobile && (
        <button
          className={styles.mobileToggle}
          onClick={() => setSidebarVisible((v) => !v)}
          aria-label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        >
          {sidebarVisible ? '\u2715' : '\u2630'}
        </button>
      )}
      <Sidebar
        onHoverSite={handleHoverSite}
        onExportClick={exportState.open}
        hidden={isMobile && !sidebarVisible}
      />
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
