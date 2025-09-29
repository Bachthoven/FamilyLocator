import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Test the password hashing functions in isolation
describe('Auth Password Functions', () => {
  async function hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }

  async function comparePasswords(supplied: string, stored: string) {
    const [hashed, salt] = stored.split('.');
    const hashedBuf = Buffer.from(hashed, 'hex');
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }

  it('should hash password correctly', async () => {
    const password = 'testpassword123';
    const hashed = await hashPassword(password);

    expect(hashed).toMatch(/^[a-f0-9]{128}\.[a-f0-9]{32}$/);
    expect(hashed).not.toBe(password);
  });

  it('should generate different hashes for the same password', async () => {
    const password = 'testpassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });

  it('should compare passwords correctly - valid password', async () => {
    const password = 'testpassword123';
    const hashed = await hashPassword(password);

    const isValid = await comparePasswords(password, hashed);
    expect(isValid).toBe(true);
  });

  it('should compare passwords correctly - invalid password', async () => {
    const password = 'testpassword123';
    const wrongPassword = 'wrongpassword456';
    const hashed = await hashPassword(password);

    const isValid = await comparePasswords(wrongPassword, hashed);
    expect(isValid).toBe(false);
  });

  it('should handle empty password', async () => {
    const password = '';
    const hashed = await hashPassword(password);

    expect(hashed).toMatch(/^[a-f0-9]{128}\.[a-f0-9]{32}$/);

    const isValid = await comparePasswords('', hashed);
    expect(isValid).toBe(true);

    const isInvalid = await comparePasswords('notempty', hashed);
    expect(isInvalid).toBe(false);
  });

  it('should handle special characters in password', async () => {
    const password = 'test!@#$%^&*()_+-=[]{}|;\':",./<>?';
    const hashed = await hashPassword(password);

    const isValid = await comparePasswords(password, hashed);
    expect(isValid).toBe(true);
  });

  it('should handle unicode characters in password', async () => {
    const password = 'test密码🔐';
    const hashed = await hashPassword(password);

    const isValid = await comparePasswords(password, hashed);
    expect(isValid).toBe(true);
  });

  it('should handle very long passwords', async () => {
    const password = 'a'.repeat(1000);
    const hashed = await hashPassword(password);

    const isValid = await comparePasswords(password, hashed);
    expect(isValid).toBe(true);
  });

  it('should fail comparison with malformed hash', async () => {
    const password = 'testpassword123';
    const malformedHash = 'not.a.valid.hash';

    await expect(comparePasswords(password, malformedHash)).rejects.toThrow();
  });

  it('should fail comparison with hash missing salt', async () => {
    const password = 'testpassword123';
    const hashWithoutSalt = 'a'.repeat(128);

    await expect(comparePasswords(password, hashWithoutSalt)).rejects.toThrow();
  });
});