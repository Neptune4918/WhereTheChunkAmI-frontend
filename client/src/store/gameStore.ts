import { create } from 'zustand'
import type { Round, RoundResultItem, LobbyPlayer } from '../types/socket'

interface RoundState {
  currentRoundIndex: number
  rounds: Round[]
  collectedResults: RoundResultItem[]
  pendingGuess: { x: number; z: number } | null
}

interface MatchState {
  matchId: string | null
  playerId: string
  username: string | null
  phase: 'idle' | 'lobby' | 'playing' | 'finished'
}

interface LobbyState {
  lobbyCode: string | null
  lobbyPlayers: LobbyPlayer[]
  isOwner: boolean
}

interface GameStore extends RoundState, MatchState, LobbyState {
  setUsername: (username: string) => void
  startMatch: (matchId: string, rounds: Round[]) => void
  resetMatch: () => void
  setLobbyCode: (code: string) => void
  setLobbyPlayers: (players: LobbyPlayer[], ownerId: string) => void
  setGuess: (x: number, z: number) => void
  submitRound: (result: RoundResultItem) => void
  nextRound: () => void
}

const PLAYER_ID = crypto.randomUUID()

const initialState = {
  // round
  currentRoundIndex: 0,
  rounds: [] as Round[],
  collectedResults: [] as RoundResultItem[],
  pendingGuess: null,
  // match
  matchId: null,
  playerId: PLAYER_ID,
  username: null,
  phase: 'idle' as const,
  // lobby
  lobbyCode: null,
  lobbyPlayers: [] as LobbyPlayer[],
  isOwner: false,
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setUsername: (username) => set({ username }),

  startMatch: (matchId, rounds) =>
    set({ matchId, rounds, phase: 'playing', currentRoundIndex: 0, collectedResults: [], pendingGuess: null }),

  resetMatch: () => set({ ...initialState, playerId: PLAYER_ID }),

  setLobbyCode: (code) => set({ lobbyCode: code, phase: 'lobby' }),

  setLobbyPlayers: (players, ownerId) =>
    set((s) => ({ lobbyPlayers: players, isOwner: ownerId === s.playerId })),

  setGuess: (x, z) => set({ pendingGuess: { x, z } }),

  submitRound: (result) =>
    set((s) => ({ collectedResults: [...s.collectedResults, result], pendingGuess: null })),

  nextRound: () =>
    set((s) => {
      const next = s.currentRoundIndex + 1
      if (next >= s.rounds.length) return { phase: 'finished' as const }
      return { currentRoundIndex: next }
    }),
}))
