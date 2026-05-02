export interface Round {
  roundId: string
  panoramaId: string
  trueX: number
  trueZ: number
}

export interface MatchStartPayload {
  matchId: string
  rounds: Round[]
}

export interface RoundResultItem {
  playerId: string
  guessedX: number
  guessedZ: number
  trueX: number
  trueZ: number
  distance: number
  score: number
  accuracy: number
}

export interface RoundEndPayload {
  matchId: string
  roundId: string
  results: RoundResultItem[]
}

export interface MatchResultItem {
  playerId: string
  totalScore: number
  avgAccuracy: number
}

export interface MatchEndPayload {
  matchId: string
  results: MatchResultItem[]
}

export interface LobbyPlayer {
  playerId: string
  username: string
}

export type ServerToClientEvents = {
  'match:start': (payload: MatchStartPayload) => void
  'round:saved': (payload: { roundId: string }) => void
  'match:finished': (payload: { matchId: string }) => void
  'lobby:joined': (payload: { code: string; matchId: string }) => void
  'lobby:update': (payload: { players: LobbyPlayer[]; ownerId: string }) => void
  'lobby:error': (payload: { message: string }) => void
  error: (payload: { message: string }) => void
}

export type ClientToServerEvents = {
  'lobby:create': (payload: { playerId: string; username: string }) => void
  'lobby:join': (payload: { code: string; playerId: string; username: string }) => void
  'lobby:start': (payload: { code: string }) => void
  'round:end': (payload: RoundEndPayload) => void
  'match:end': (payload: MatchEndPayload) => void
}
