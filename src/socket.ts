import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { db } from "./config/database";
import { env } from "./config/env";
import { verifyToken } from "./utils/jwt";

type SocketWithUser = {
  userId?: string;
  duelId?: string;
};

export function isAuthorizedDuelParticipant(
  userId: string,
  duel: { creator_id: string; opponent_id?: string | null }
): boolean {
  return duel.creator_id === userId || duel.opponent_id === userId;
}

async function canJoinDuelRoom(userId: string, duelId: string): Promise<boolean> {
  const { data: duel, error } = await db
    .from("duels")
    .select("id, creator_id, opponent_id")
    .eq("id", duelId)
    .maybeSingle<{ id: string; creator_id: string; opponent_id: string | null }>();

  if (error || !duel) return false;
  if (isAuthorizedDuelParticipant(userId, duel)) return true;

  const { data: player, error: playerError } = await db
    .from("duel_players")
    .select("id")
    .eq("duel_id", duelId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (playerError) throw playerError;
  return Boolean(player);
}

export function setupSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL.split(",").map((origin) => origin.trim()).filter(Boolean),
      credentials: true
    },
    transports: ["websocket", "polling"]
  });

  io.use((socket, next) => {
    const authHeader = socket.handshake.auth?.token ?? socket.handshake.headers?.authorization;
    const token = typeof authHeader === "string" ? authHeader : Array.isArray(authHeader) ? authHeader[0] : undefined;
    if (!token || !token.startsWith("Bearer ")) {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    try {
      const payload = verifyToken(token.slice(7));
      (socket as typeof socket & SocketWithUser).userId = payload.sub;
      next();
    } catch {
      next(new Error("INVALID_TOKEN"));
    }
  });

  io.on("connection", (socket) => {
    const socketWithUser = socket as typeof socket & SocketWithUser;

    socket.on("join_duel", async (duelId: string) => {
      if (!socketWithUser.userId || !duelId) {
        socket.emit("duel_error", {
          code: "INVALID_DUEL_JOIN",
          message: "A valid duelId is required."
        });
        return;
      }

      try {
        const canJoin = await canJoinDuelRoom(socketWithUser.userId, duelId);
        if (!canJoin) {
          socket.emit("duel_error", {
            code: "NOT_A_PARTICIPANT",
            message: "You are not authorized to join this duel room."
          });
          return;
        }

        socketWithUser.duelId = duelId;
        await socket.join(`duel:${duelId}`);
      } catch {
        socket.emit("duel_error", {
          code: "DUEL_JOIN_FAILED",
          message: "Unable to validate duel membership."
        });
      }
    });

    socket.on("leave_duel", (duelId: string) => {
      if (!duelId) return;
      void socket.leave(`duel:${duelId}`);
      if (socketWithUser.duelId === duelId) {
        socketWithUser.duelId = undefined;
      }
    });

    socket.on("disconnect", () => {
      if (socketWithUser.duelId) {
        void socket.leave(`duel:${socketWithUser.duelId}`);
      }
    });
  });

  return io;
}
