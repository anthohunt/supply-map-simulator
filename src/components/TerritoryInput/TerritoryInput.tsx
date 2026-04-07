import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useTerritoryStore } from '@/stores/territoryStore.ts'
import type { Territory, TerritoryType } from '@/types/index.ts'
import styles from './TerritoryInput.module.css'

interface TerritoryOption {
  id: string
  name: string
  type: TerritoryType
  bbox: [number, number, number, number]
}

const TERRITORIES: TerritoryOption[] = [
  { id: 'us-southeast', name: 'US Southeast', type: 'megaregion', bbox: [-91.66, 24.52, -75.46, 36.59] },
  { id: 'us-northeast', name: 'US Northeast', type: 'megaregion', bbox: [-80.52, 38.79, -66.95, 47.46] },
  { id: 'us-midwest', name: 'US Midwest', type: 'megaregion', bbox: [-97.24, 36.99, -80.52, 49.38] },
  { id: 'us-texas-triangle', name: 'Texas Triangle', type: 'megaregion', bbox: [-106.65, 25.84, -93.51, 34.31] },
  { id: 'us-california', name: 'California', type: 'state', bbox: [-124.41, 32.53, -114.13, 42.01] },
  { id: 'south-korea', name: 'South Korea', type: 'country', bbox: [124.61, 33.11, 131.87, 38.62] },
  { id: 'france', name: 'France', type: 'country', bbox: [-5.14, 41.33, 9.56, 51.09] },
  { id: 'germany', name: 'Germany', type: 'country', bbox: [5.87, 47.27, 15.04, 55.06] },
  { id: 'japan', name: 'Japan', type: 'country', bbox: [129.41, 30.98, 145.81, 45.52] },
  { id: 'benelux', name: 'Benelux', type: 'megaregion', bbox: [2.55, 49.50, 7.22, 53.51] },
]

function bboxToSimpleBoundary(bbox: [number, number, number, number]): GeoJSON.Polygon {
  const [west, south, east, north] = bbox
  return {
    type: 'Polygon',
    coordinates: [[
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ]],
  }
}

export function TerritoryInput() {
  const { searchQuery, selectedTerritory, setSearchQuery, setSelectedTerritory, setCurrentScreen } =
    useTerritoryStore()
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    if (searchQuery.length < 2) return []
    const query = searchQuery.toLowerCase()
    return TERRITORIES.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.type.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchQuery(value)
      setIsOpen(value.length >= 2)
      setHighlightedIndex(-1)
      if (selectedTerritory) {
        setSelectedTerritory(null)
      }
    },
    [setSearchQuery, selectedTerritory, setSelectedTerritory]
  )

  const selectTerritory = useCallback(
    (option: TerritoryOption) => {
      const territory: Territory = {
        id: option.id,
        name: option.name,
        type: option.type,
        boundary: bboxToSimpleBoundary(option.bbox),
        bbox: option.bbox,
      }
      setSelectedTerritory(territory)
      setSearchQuery(option.name)
      setIsOpen(false)
    },
    [setSelectedTerritory, setSearchQuery]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || filtered.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        )
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault()
        const selected = filtered[highlightedIndex]
        if (selected) {
          selectTerritory(selected)
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false)
      }
    },
    [isOpen, filtered, highlightedIndex, selectTerritory]
  )

  const handleStartPipeline = useCallback(() => {
    if (selectedTerritory) {
      setCurrentScreen('data-pipeline')
    }
  }, [selectedTerritory, setCurrentScreen])

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  const typeLabel = (type: TerritoryType): string => {
    const labels: Record<TerritoryType, string> = {
      megaregion: 'Megaregion',
      country: 'Country',
      state: 'State',
      custom: 'Custom',
    }
    return labels[type]
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Territory Search</h2>
      <p className={styles.subtitle}>
        Search for a megaregion, country, or state to begin network generation.
      </p>

      <div className={styles.searchWrapper}>
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder="Search territories..."
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.length >= 2 && !selectedTerritory) {
              setIsOpen(true)
            }
          }}
          onBlur={() => {
            // Delay to allow click on suggestion
            window.setTimeout(() => setIsOpen(false), 200)
          }}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="territory-suggestions"
          aria-label="Search territories"
        />

        {isOpen && filtered.length > 0 && (
          <ul
            ref={listRef}
            id="territory-suggestions"
            className={styles.suggestions}
            role="listbox"
          >
            {filtered.map((option, index) => (
              <li
                key={option.id}
                className={`${styles.suggestion} ${
                  index === highlightedIndex ? styles.highlighted : ''
                }`}
                role="option"
                aria-selected={index === highlightedIndex}
                onMouseDown={() => selectTerritory(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span className={styles.suggestionName}>{option.name}</span>
                <span className={styles.suggestionType}>
                  {typeLabel(option.type)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {isOpen && searchQuery.length >= 2 && filtered.length === 0 && (
          <div className={styles.noResults}>
            No territories found. Try &quot;Southeast&quot; or &quot;France&quot;.
          </div>
        )}
      </div>

      {selectedTerritory && (
        <div className={styles.selected}>
          <div className={styles.selectedInfo}>
            <span className={styles.selectedName}>
              {selectedTerritory.name}
            </span>
            <span className={styles.selectedType}>
              {typeLabel(selectedTerritory.type)}
            </span>
          </div>
          <button
            className={styles.startButton}
            onClick={handleStartPipeline}
            aria-label="Start data pipeline"
          >
            Start Pipeline
          </button>
        </div>
      )}
    </div>
  )
}
