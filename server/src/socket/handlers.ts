import { Server, Socket } from 'socket.io'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { createLobby, getLobby, addPlayer, removePlayerBySocket } from '../lib/lobby'
import { generateRounds } from '../lib/locations'

const LobbyCreateSchema = z.object({
  playerId: z.string().uuid(),
  username: z.string().min(1).max(32),
})

const LobbyJoinSchema = z.object({
  code: z.string().length(6),
  playerId: z.string().uuid(),
  username: z.string().min(1).max(32),
})

const LobbyStartSchema = z.object({
  code: z.string().length(6),
})

const RoundEndSchema = z.object({
  matchId: z.string().uuid(),
  roundId: z.string(),
  results: z.array(
    z.object({
      playerId: z.string().uuid(),
      guessedX: z.number(),
      guessedZ: z.number(),
      trueX: z.number(),
      trueZ: z.number(),
      distance: z.number().nonnegative(),
      score: z.number().int().min(0).max(5000),
      accuracy: z.number().min(0).max(1),
    })
  ),
})

const MatchEndSchema = z.object({
  matchId: z.string().uuid(),
  results: z.array(
    z.object({
      playerId: z.string().uuid(),
      totalScore: z.number().int().nonnegative(),
      avgAccuracy: z.number().min(0).max(1),
    })
  ),
})

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id}`)

    // ── LOBBY ─────────────────────────────────────────

    socket.on('lobby:create', async (payload: unknown) => {
      const parsed = LobbyCreateSchema.safeParse(payload)
      if (!parsed.success) {
        socket.emit('lobby:error', { message: 'Невалидни данни' })
        return
      }

      const { playerId, username } = parsed.data

      await prisma.user.upsert({
        where: { id: playerId },
        update: { username },
        create: { id: playerId, username },
      })

      const lobby = createLobby({ playerId, username, socketId: socket.id })

      await prisma.match.create({
        data: { id: lobby.matchId, code: lobby.code },
      })

      socket.join(lobby.matchId)
      socket.emit('lobby:joined', { code: lobby.code, matchId: lobby.matchId })
      io.to(lobby.matchId).emit('lobby:update', {
        players: lobby.players.map((p) => ({ playerId: p.playerId, username: p.username })),
        ownerId: lobby.ownerId,
      })
    })

    socket.on('lobby:join', async (payload: unknown) => {
      const parsed = LobbyJoinSchema.safeParse(payload)
      if (!parsed.success) {
        socket.emit('lobby:error', { message: 'Невалидни данни' })
        return
      }

      const { code, playerId, username } = parsed.data
      const lobby = addPlayer(code, { playerId, username, socketId: socket.id })

      if (!lobby) {
        socket.emit('lobby:error', { message: 'Лобито не е намерено. Провери кода.' })
        return
      }

      await prisma.user.upsert({
        where: { id: playerId },
        update: { username },
        create: { id: playerId, username },
      })

      socket.join(lobby.matchId)
      socket.emit('lobby:joined', { code: lobby.code, matchId: lobby.matchId })
      io.to(lobby.matchId).emit('lobby:update', {
        players: lobby.players.map((p) => ({ playerId: p.playerId, username: p.username })),
        ownerId: lobby.ownerId,
      })
    })

    socket.on('lobby:start', async (payload: unknown) => {
      const parsed = LobbyStartSchema.safeParse(payload)
      if (!parsed.success) {
        socket.emit('lobby:error', { message: 'Невалидни данни' })
        return
      }

      const { code } = parsed.data
      const lobby = getLobby(code)

      if (!lobby) {
        socket.emit('lobby:error', { message: 'Лобито не е намерено' })
        return
      }

      const player = lobby.players.find((p) => p.socketId === socket.id)
      if (!player || player.playerId !== lobby.ownerId) {
        socket.emit('lobby:error', { message: 'Само хостът може да стартира играта' })
        return
      }

      await prisma.match.update({
        where: { id: lobby.matchId },
        data: { status: 'ACTIVE' },
      })

      const rounds = generateRounds(5)

      io.to(lobby.matchId).emit('match:start', { matchId: lobby.matchId, rounds })
    })

    // ── GAME ──────────────────────────────────────────

    socket.on('round:end', async (payload: unknown) => {
      const parsed = RoundEndSchema.safeParse(payload)
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid round:end payload' })
        return
      }

      const { matchId, roundId, results } = parsed.data

      await prisma.$transaction(
        results.map((r) =>
          prisma.roundResult.upsert({
            where: { matchId_roundId_playerId: { matchId, roundId, playerId: r.playerId } },
            update: r,
            create: { matchId, roundId, ...r },
          })
        )
      )

      io.to(matchId).emit('round:saved', { roundId })
    })

    socket.on('match:end', async (payload: unknown) => {
      const parsed = MatchEndSchema.safeParse(payload)
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid match:end payload' })
        return
      }

      const { matchId, results } = parsed.data

      await prisma.$transaction([
        ...results.map((r) =>
          prisma.matchResult.upsert({
            where: { matchId_playerId: { matchId, playerId: r.playerId } },
            update: r,
            create: { matchId, ...r },
          })
        ),
        prisma.match.update({
          where: { id: matchId },
          data: { status: 'FINISHED' },
        }),
      ])

      io.to(matchId).emit('match:finished', { matchId })
    })

    // ── DISCONNECT ────────────────────────────────────

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`)
      const lobby = removePlayerBySocket(socket.id)
      if (lobby) {
        io.to(lobby.matchId).emit('lobby:update', {
          players: lobby.players.map((p) => ({ playerId: p.playerId, username: p.username })),
          ownerId: lobby.ownerId,
        })
      }
    })
  })
}

