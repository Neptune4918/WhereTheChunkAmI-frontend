import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

export default function ResultsPage() {
  const navigate = useNavigate()
  const { collectedResults, username, resetMatch } = useGameStore()

  const totalScore = collectedResults.reduce((s, r) => s + r.score, 0)
  const avgAccuracy =
    collectedResults.length > 0
      ? collectedResults.reduce((s, r) => s + r.accuracy, 0) / collectedResults.length
      : 0

  function handlePlayAgain() {
    resetMatch()
    navigate('/')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h1>Резултати</h1>
      <p>Играч: <strong>{username}</strong></p>
      <p>Общо точки: <strong>{totalScore}</strong></p>
      <p>Средна точност: <strong>{(avgAccuracy * 100).toFixed(1)}%</strong></p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>Рунд</th>
            <th>Разстояние</th>
            <th>Точки</th>
            <th>Точност</th>
          </tr>
        </thead>
        <tbody>
          {collectedResults.map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{r.distance.toFixed(0)} блока</td>
              <td>{r.score}</td>
              <td>{(r.accuracy * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={handlePlayAgain} style={{ marginTop: '1.5rem' }}>
        Играй отново
      </button>
    </div>
  )
}
