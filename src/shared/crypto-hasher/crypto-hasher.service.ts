import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

@Injectable()
export class CryptoHasherService {
  async hash(text: string, salt?: string): Promise<string> {
    const resolvedSalt = salt ?? randomBytes(16).toString('hex');
    const hash = (await this.deriveHash(text, resolvedSalt)).toString('hex');
    return `${hash}:${resolvedSalt}`;
  }

  async compare(text: string, hashedText: string): Promise<boolean> {
    const separatorIndex = hashedText.indexOf(':');
    if (separatorIndex < 0) {
      return false;
    }

    const hashOriginal = hashedText.slice(0, separatorIndex);
    const salt = hashedText.slice(separatorIndex + 1);
    if (!/^[\da-f]{128}$/i.test(hashOriginal) || salt.length === 0) {
      return false;
    }

    const hashNewBuffer = await this.deriveHash(text, salt);
    const hashedOriginalBuffer = Buffer.from(hashOriginal, 'hex');

    if (hashNewBuffer.length !== hashedOriginalBuffer.length) {
      return false;
    }

    return timingSafeEqual(hashNewBuffer, hashedOriginalBuffer);
  }

  private deriveHash(text: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(text, salt, KEY_LENGTH, (error, derivedHash) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedHash);
      });
    });
  }
}
