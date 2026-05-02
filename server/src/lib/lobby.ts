import { randomUUID } from 'crypto'

export interface LobbyPlayer {
  playerId: string
  username: string
  socketId: string
}

export interface Lobby {
  code: string
  matchId: string
  ownerId: string
  players: LobbyPlayer[]
}

const lobbies = new Map<string, Lobby>()

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return lobbies.has(code) ? generateCode() : code
}

export function createLobby(player: LobbyPlayer): Lobby {
  const code = generateCode()
  const matchId = randomUUID()
  const lobby: Lobby = { code, matchId, ownerId: player.playerId, players: [player] }
  lobbies.set(code, lobby)
  return lobby
}

export function getLobby(code: string): Lobby | undefined {
  return lobbies.get(code.toUpperCase())
}

export function addPlayer(code: string, player: LobbyPlayer): Lobby | null {
  const lobby = lobbies.get(code.toUpperCase())
  if (!lobby) return null
  lobby.players = lobby.players.filter((p) => p.playerId !== player.playerId)
  lobby.players.push(player)
  return lobby
}

export function removePlayerBySocket(socketId: string): Lobby | null {
  for (const lobby of lobbies.values()) {
    const player = lobby.players.find((p) => p.socketId === socketId)
    if (!player) continue

    lobby.players = lobby.players.filter((p) => p.socketId !== socketId)

    if (lobby.players.length === 0) {
      lobbies.delete(lobby.code)
      return null
    }

    if (player.playerId === lobby.ownerId) {
      lobby.ownerId = lobby.players[0].playerId
    }

    return lobby
  }
  return null
}

export function deleteLobby(code: string) {
  lobbies.delete(code.toUpperCase())
}
