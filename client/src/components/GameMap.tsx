import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const MAP_SIZE = 16384
const TOP_LEFT_X = -9712
const TOP_LEFT_Z = -10240

const gameCRS = L.Util.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(1 / 64, 0, -1 / 64, 256),
})

const MIN_PANEL = 250
const MAX_PANEL = 800

interface Props {
  onGuess: (x: number, z: number) => void
}

export default function GameMap({ onGuess }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const onGuessRef = useRef(onGuess)
  onGuessRef.current = onGuess

  const [size, setSize] = useState(350)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, size: 350 })

  // Invalidate map size when panel resizes
  useEffect(() => {
    mapRef.current?.invalidateSize()
  }, [size])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, size }
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      // Drag top-left handle: moving left/up increases size
      const dx = dragStart.current.x - ev.clientX
      const dy = dragStart.current.y - ev.clientY
      const delta = Math.max(dx, dy)
      const next = Math.min(MAX_PANEL, Math.max(MIN_PANEL, dragStart.current.size + delta))
      setSize(next)
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [size])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const bounds: L.LatLngBoundsExpression = [[0, 0], [MAP_SIZE, MAP_SIZE]]

    const map = L.map(containerRef.current, {
      crs: gameCRS,
      minZoom: 0,
      maxZoom: 10,
      zoomSnap: 0.1,
      zoomDelta: 0.25,
      wheelPxPerZoomLevel: 40,
      scrollWheelZoom: true,
      attributionControl: false,
    })

    const r2 = import.meta.env.VITE_R2_URL ?? ''
    const tileLayer = L.TileLayer.extend({
      getTileUrl(coords: L.Coords): string {
        const yFlipped = Math.pow(2, coords.z) - 1 - coords.y
        return `${r2}/tiles/${coords.z}/${coords.x}/${yFlipped}.png`
      },
    })
    new tileLayer('', {
      minNativeZoom: 0,
      maxNativeZoom: 6,
      bounds,
      noWrap: true,
    }).addTo(map)

    map.fitBounds(bounds)

    map.on('click', (e: L.LeafletMouseEvent) => {
      const minecraftX = Math.round(TOP_LEFT_X + e.latlng.lng)
      const minecraftZ = Math.round(TOP_LEFT_Z + (MAP_SIZE - e.latlng.lat))

      if (markerRef.current) markerRef.current.remove()
      markerRef.current = L.circleMarker(e.latlng, {
        radius: 8,
        color: '#ff3333',
        fillColor: '#ff3333',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map)

      onGuessRef.current(minecraftX, minecraftZ)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        bottom: '1rem',
        right: '1rem',
        width: `${size}px`,
        height: `${size}px`,
        zIndex: 1000,
      }}
    >
      {/* Drag handle — top-left corner */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '18px',
          height: '18px',
          cursor: 'nw-resize',
          zIndex: 1001,
          background: 'rgba(80,80,80,0.85)',
          borderRadius: '4px 0 4px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          color: '#ccc',
          userSelect: 'none',
        }}
        title="Drag to resize"
      >⤡</div>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          border: '2px solid #555',
          borderRadius: '4px',
          background: '#111',
          overflow: 'hidden',
        }}
      />
    </div>
  )
}


