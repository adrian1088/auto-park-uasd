import { Injectable } from '@nestjs/common';
import  bcrypt from 'bcrypt';
import { IEcryptService } from './encrypt.interfaces';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EncryptService implements IEcryptService {
  private rounds: number;

  constructor(private readonly configService: ConfigService) {
    this.rounds = this.configService.get<number>('crypto.saltRounds') ?? 10;
  }
  async hash(hashString: string): Promise<string> {
    return await bcrypt.hash(hashString, this.rounds);
  }

  async compare(data: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(data, hash);
  }
}
