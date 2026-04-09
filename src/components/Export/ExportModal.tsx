import { useEffect, useRef, useCallback } from 'react'
import { PNGExport } from './PNGExport.tsx'
import { GeoJSONExport } from './GeoJSONExport.tsx'
import { JSONExport } from './JSONExport.tsx'
import { CSVExport } from './CSVExport.tsx'
import type { ExportTab } from '@/hooks/useExport.ts'
import styles from './Export.module.css'

interface ExportModalProps {
  isOpen: boolean
  activeTab: ExportTab
  onTabChange: (tab: ExportTab) => void
  onClose: () => void
}

const TABS: { key: ExportTab; label: string }[] = [
  { key: 'png', label: 'PNG' },
  { key: 'geojson', label: 'GeoJSON' },
  { key: 'json', label: 'JSON' },
  { key: 'csv', label: 'CSV' },
]

export function ExportModal({ isOpen, activeTab, onTabChange, onClose }: ExportModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)

  // Store the element that had focus before modal opened
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement
      // Focus the modal container after render
      requestAnimationFrame(() => {
        modalRef.current?.focus()
      })
    } else if (previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [isOpen])

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return

    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Export network data"
    >
      <div
        className={styles.modal}
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Export</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close export modal"
          >
            &times;
          </button>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Export format tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => onTabChange(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`export-panel-${tab.key}`}
              id={`export-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className={styles.content}
          role="tabpanel"
          id={`export-panel-${activeTab}`}
          aria-labelledby={`export-tab-${activeTab}`}
        >
          {activeTab === 'png' && <PNGExport />}
          {activeTab === 'geojson' && <GeoJSONExport />}
          {activeTab === 'json' && <JSONExport />}
          {activeTab === 'csv' && <CSVExport />}
        </div>
      </div>
    </div>
  )
}
