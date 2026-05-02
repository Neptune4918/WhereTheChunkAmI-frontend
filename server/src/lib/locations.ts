import { readFileSync } from 'fs'
import { join } from 'path'
import type { Round } from '../types/socket'

interface LocationEntry {
  id: string
  x: number
  y: number
  z: number
}

const MOCK_LOCATIONS: LocationEntry[] = [
  { id: 'mock-001', x: 0, y: 64, z: 0 },
  { id: 'mock-002', x: -2500, y: 68, z: 1500 },
  { id: 'mock-003', x: 1800, y: 72, z: -3200 },
  { id: 'mock-004', x: -6000, y: 65, z: 4000 },
  { id: 'mock-005', x: 3200, y: 70, z: 6500 },
]

function loadLocations(): LocationEntry[] {
  try {
    const filePath = join(__dirname, '../data/locations.json')
    const raw = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw) as { entries: LocationEntry[] }
    return data.entries
  } catch {
    return MOCK_LOCATIONS
  }
}

export function generateRounds(count = 5): Round[] {
  const all = loadLocations()
  const shuffled = [...all].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((loc, i) => ({
    roundId: `round-${i + 1}`,
    panoramaId: loc.id,
    trueX: loc.x,
    trueZ: loc.z,
  }))
}
