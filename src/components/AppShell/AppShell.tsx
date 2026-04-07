import { Sidebar } from '@/components/Sidebar/Sidebar.tsx'
import { MapView } from '@/components/Map/MapView.tsx'
import styles from './AppShell.module.css'

export function AppShell() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <MapView />
      </main>
    </div>
  )
}
