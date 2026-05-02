import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket'
import { useGameStore } from '../store/gameStore'
import PanoramaViewer from '../components/PanoramaViewer'
import GameMap from '../components/GameMap'
import { calculateScore } from '../utils/scoring'

export default function GamePage() {
  const navigate = useNavigate()
  const {
    matchId, playerId, rounds, currentRoundIndex, pendingGuess,
    phase, setGuess, submitRound, nextRound, collectedResults,
  } = useGameStore()

  const currentRound = rounds[currentRoundIndex]

  useEffect(() => {
    if (!matchId || !playerId) {
      navigate('/')
      return
    }
  }, [matchId, navigate])

  useEffect(() => {
    if (phase === 'finished') {
      handleMatchEnd()
    }
  }, [phase])

  function handleGuessConfirm() {
    if (!pendingGuess || !currentRound || !matchId || !playerId) return

    const distance = Math.sqrt(
      Math.pow(pendingGuess.x - currentRound.trueX, 2) +
      Math.pow(pendingGuess.z - currentRound.trueZ, 2)
    )
    const score = calculateScore(distance)
    const accuracy = Math.max(0, 1 - distance / 5000)

    const result = {
      playerId,
      guessedX: pendingGuess.x,
      guessedZ: pendingGuess.z,
      trueX: currentRound.trueX,
      trueZ: currentRound.trueZ,
      distance,
      score,
      accuracy,
    }

    socket.emit('round:end', {
      matchId,
      roundId: currentRound.roundId,
      results: [result],
    })

    submitRound(result)
    nextRound()
  }

  async function handleMatchEnd() {
    if (!matchId || !playerId) return

    const totalScore = collectedResults.reduce((s, r) => s + r.score, 0)
    const avgAccuracy =
      collectedResults.length > 0
        ? collectedResults.reduce((s, r) => s + r.accuracy, 0) / collectedResults.length
        : 0

    socket.emit('match:end', {
      matchId,
      results: [{ playerId, totalScore, avgAccuracy }],
    })

    navigate('/results')
  }

  if (!currentRound) return <p>Зареждане...</p>

  const panoramaUrl = `${import.meta.env.VITE_R2_URL ?? 'https://your-r2-bucket.r2.dev'}/panoramas/${currentRound.panoramaId}.webp`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '0.5rem 1rem', background: '#111', color: '#fff', display: 'flex', gap: '1rem' }}>
        <span>Рунд {currentRoundIndex + 1} / {rounds.length}</span>
        <span>Точки: {collectedResults.reduce((s, r) => s + r.score, 0)}</span>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <PanoramaViewer url={panoramaUrl} />
        <GameMap onGuess={(x, z) => setGuess(x, z)} />
      </div>

      {pendingGuess && (
        <div style={{ padding: '0.75rem', background: '#222', textAlign: 'center' }}>
          <button onClick={handleGuessConfirm} style={{ fontSize: '1rem', padding: '0.5rem 2rem' }}>
            Потвърди guess
          </button>
        </div>
      )}
    </div>
  )
}
