import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket'
import { useGameStore } from '../store/gameStore'
import type { MatchStartPayload } from '../types/socket'

type Screen = 'home' | 'waiting'

export default function LobbyPage() {
  const navigate = useNavigate()
  const { playerId, setUsername, setLobbyCode, setLobbyPlayers, startMatch, lobbyCode, lobbyPlayers, isOwner } =
    useGameStore()

  const [screen, setScreen] = useState<Screen>('home')
  const [usernameInput, setUsernameInput] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    socket.connect()

    socket.on('lobby:joined', ({ code }) => {
      setLobbyCode(code)
      setScreen('waiting')
      setError('')
    })

    socket.on('lobby:update', ({ players, ownerId }) => {
      setLobbyPlayers(players, ownerId)
    })

    socket.on('lobby:error', ({ message }) => {
      setError(message)
    })

    socket.on('match:start', (payload: MatchStartPayload) => {
      startMatch(payload.matchId, payload.rounds)
      navigate('/game')
    })

    return () => {
      socket.off('lobby:joined')
      socket.off('lobby:update')
      socket.off('lobby:error')
      socket.off('match:start')
    }
  }, [])

  function validate(): boolean {
    if (!usernameInput.trim()) {
      setError('Въведи потребителско име')
      return false
    }
    setError('')
    setUsername(usernameInput.trim())
    return true
  }

  function handleCreate() {
    if (!validate()) return
    socket.emit('lobby:create', { playerId, username: usernameInput.trim() })
  }

  function handleJoin() {
    if (!validate()) return
    if (codeInput.trim().length !== 6) {
      setError('Кодът трябва да е 6 символа')
      return
    }
    socket.emit('lobby:join', { code: codeInput.trim().toUpperCase(), playerId, username: usernameInput.trim() })
  }

  function handleStart() {
    if (lobbyCode) socket.emit('lobby:start', { code: lobbyCode })
  }

  if (screen === 'waiting') {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Where The Chunk Am I?</h1>

        <div style={styles.card}>
          <p style={{ margin: '0 0 0.25rem', color: '#999', fontSize: '0.85rem' }}>Код на лобито</p>
          <div style={styles.code}>{lobbyCode}</div>
          <p style={{ margin: '0.5rem 0 1.5rem', color: '#888', fontSize: '0.85rem' }}>
            Споделете кода с приятели
          </p>

          <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Играчи ({lobbyPlayers.length})</p>
          <ul style={styles.playerList}>
            {lobbyPlayers.map((p) => (
              <li key={p.playerId} style={styles.playerItem}>
                <span>{p.username}</span>
                {p.playerId === lobbyPlayers.find((_, i) => i === 0)?.playerId && isOwner && (
                  <span style={styles.hostBadge}>хост</span>
                )}
              </li>
            ))}
          </ul>

          {isOwner ? (
            <button onClick={handleStart} style={{ ...styles.btn, marginTop: '1.5rem', width: '100%' }}>
              Стартирай играта →
            </button>
          ) : (
            <p style={{ color: '#888', textAlign: 'center', marginTop: '1.5rem' }}>
              Изчакване хостът да стартира...
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Where The Chunk Am I?</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>Minecraft GeoGuessr</p>

      <div style={styles.card}>
        <label style={styles.label}>Потребителско име</label>
        <input
          style={styles.input}
          placeholder="Твоето име"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          maxLength={32}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button onClick={handleCreate} style={{ ...styles.btn, width: '100%', marginTop: '1rem' }}>
          Създай ново лоби
        </button>

        <div style={styles.divider}>или</div>

        <label style={styles.label}>Код на лоби</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            style={{ ...styles.input, flex: 1, textTransform: 'uppercase', letterSpacing: '0.15em' }}
            placeholder="ABCD12"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={6}
          />
          <button onClick={handleJoin} style={styles.btnSecondary}>
            Влез
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  title: {
    margin: '0 0 0.25rem',
    fontSize: '2rem',
    fontWeight: 700,
  },
  card: {
    background: '#242424',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '1.75rem',
    width: '100%',
    maxWidth: 400,
  },
  label: {
    display: 'block',
    marginBottom: '0.4rem',
    fontSize: '0.85rem',
    color: '#aaa',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: 4,
    border: '1px solid #444',
    background: '#1a1a1a',
    color: '#e0e0e0',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  btn: {
    padding: '0.65rem 1.25rem',
    borderRadius: 4,
    border: 'none',
    background: '#3a7bd5',
    color: '#fff',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 600,
  },
  btnSecondary: {
    padding: '0.65rem 1rem',
    borderRadius: 4,
    border: '1px solid #444',
    background: '#2a2a2a',
    color: '#e0e0e0',
    fontSize: '1rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  divider: {
    textAlign: 'center' as const,
    color: '#555',
    margin: '1.25rem 0',
    fontSize: '0.85rem',
  },
  code: {
    fontSize: '2.5rem',
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: '#3a7bd5',
    fontFamily: 'monospace',
  },
  playerList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
  },
  playerItem: {
    padding: '0.5rem 0.75rem',
    background: '#1a1a1a',
    borderRadius: 4,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostBadge: {
    fontSize: '0.7rem',
    background: '#3a7bd5',
    color: '#fff',
    padding: '0.15rem 0.5rem',
    borderRadius: 12,
  },
  error: {
    color: '#e05555',
    margin: '0.5rem 0 0',
    fontSize: '0.9rem',
  },
}

