jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
}));

import { CryptoHasherService } from './crypto-hasher.service';

describe('CryptoHasherService', () => {
  let service: CryptoHasherService;

  beforeEach(() => {
    service = new CryptoHasherService();
  });

  it('hashes and compares the same text', async () => {
    const hashedText = await service.hash('secret', 'fixed-salt');

    expect(hashedText).toMatch(/^[\da-f]{128}:fixed-salt$/);
    await expect(service.compare('secret', hashedText)).resolves.toBe(true);
    await expect(service.compare('incorrect', hashedText)).resolves.toBe(false);
  });

  it.each(['', 'invalid', `${'a'.repeat(128)}:`, `not-a-hash:salt`])(
    'returns false for malformed hash "%s"',
    async (hashedText) => {
      await expect(service.compare('secret', hashedText)).resolves.toBe(false);
    },
  );
});
