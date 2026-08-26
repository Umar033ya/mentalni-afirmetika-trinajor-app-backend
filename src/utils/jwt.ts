import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];

export interface JwtPayload {
  sub: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
