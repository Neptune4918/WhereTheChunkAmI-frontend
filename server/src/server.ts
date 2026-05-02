import Fastify from 'fastify'
import cors from '@fastify/cors'
import { Server } from 'socket.io'
import { registerSocketHandlers } from './socket/handlers'
import { prisma } from './lib/prisma'

async function main() {
  const fastify = Fastify({ logger: true })

  await fastify.register(cors, {
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
  })

  const io = new Server(fastify.server, {
    cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:5173' },
  })

  registerSocketHandlers(io)

  fastify.get('/leaderboard', async () => {
    return prisma.matchResult.findMany({
      include: {
        player: { select: { id: true, username: true } },
      },
      orderBy: { totalScore: 'desc' },
    })
  })

  await fastify.listen({
    port: Number(process.env.PORT) || 3001,
    host: '0.0.0.0',
  })
}

main().catch(console.error)
