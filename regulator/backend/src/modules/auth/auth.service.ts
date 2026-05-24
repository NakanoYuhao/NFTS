import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../config/prisma.service';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';

@Injectable()
export class AuthService {
  private nonceStore: Map<string, { nonce: string; expires: number }> = new Map();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async getNonce(address: string): Promise<string> {
    const nonce = randomBytes(16).toString('hex');
    this.nonceStore.set(address.toLowerCase(), { nonce, expires: Date.now() + 5 * 60 * 1000 });
    return nonce;
  }

  async login(address: string, message: string, signature: string) {
    const addr = address.toLowerCase();
    const stored = this.nonceStore.get(addr);
    if (!stored || Date.now() > stored.expires) {
      throw new UnauthorizedException('Nonce expired or not found');
    }
    if (!message.includes(stored.nonce)) {
      throw new UnauthorizedException('Invalid message format');
    }

    try {
      const recovered = ethers.verifyMessage(message, signature);
      if (recovered.toLowerCase() !== addr) {
        throw new UnauthorizedException('Signature verification failed');
      }
    } catch {
      throw new UnauthorizedException('Signature verification failed');
    }

    this.nonceStore.delete(addr);

    const creator = await this.prisma.creator.findUnique({ where: { address: addr } });

    const payload = {
      sub: addr, address,
      did: creator?.did || null,
      roles: creator?.isVerified ? ['creator', 'verified'] : ['creator'],
    };
    const token = this.jwtService.sign(payload);

    return { token, did: creator?.did || null, isVerified: creator?.isVerified || false, address };
  }

  async validateToken(payload: any) {
    return { address: payload.sub || payload.address, did: payload.did, roles: payload.roles || [] };
  }
}
