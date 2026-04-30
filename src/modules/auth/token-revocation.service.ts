import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class TokenRevocationService {
  private readonly revokedTokens = new Map<string, number>();

  revokeToken(token: string, expiresAtMs?: number): void {
    const tokenKey = this.hashToken(token);
    const fallbackExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    this.revokedTokens.set(tokenKey, expiresAtMs ?? fallbackExpiry);
    this.cleanupExpiredTokens();
  }

  isTokenRevoked(token: string): boolean {
    this.cleanupExpiredTokens();
    const tokenKey = this.hashToken(token);
    const expiresAtMs = this.revokedTokens.get(tokenKey);
    if (!expiresAtMs) return false;

    if (expiresAtMs <= Date.now()) {
      this.revokedTokens.delete(tokenKey);
      return false;
    }

    return true;
  }

  extractTokenFromRequest(req: Request | undefined): string | null {
    if (!req) return null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    const cookieToken = req.cookies?.auth_token;
    if (cookieToken) return cookieToken;

    const rawCookie = req.headers.cookie;
    if (!rawCookie) return null;

    const match = rawCookie
      .split(';')
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith('auth_token='));

    if (!match) return null;

    const value = match.slice('auth_token='.length);
    return value ? decodeURIComponent(value) : null;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [tokenKey, expiresAtMs] of this.revokedTokens.entries()) {
      if (expiresAtMs <= now) {
        this.revokedTokens.delete(tokenKey);
      }
    }
  }
}
