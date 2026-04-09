import { useState, useCallback } from 'react'

export type ExportTab = 'png' | 'geojson' | 'json' | 'csv'

export function useExport() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ExportTab>('png')

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return { isOpen, activeTab, setActiveTab, open, close }
}
