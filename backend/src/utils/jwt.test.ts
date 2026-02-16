import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateToken, verifyToken, JWTPayload } from './jwt';

describe('JWT Utility Functions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
    process.env.JWT_EXPIRATION = '24h';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token with required claims', () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'USER',
        walletNumber: 'WLT88800001',
      };

      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate a token that can be verified', () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'AGENT',
        walletNumber: 'WLT77700001',
      };

      const token = generateToken(payload);
      const result = verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.userId).toBe(payload.userId);
      expect(result.payload?.role).toBe(payload.role);
      expect(result.payload?.walletNumber).toBe(payload.walletNumber);
    });

    it('should generate a token without walletNumber if not provided', () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'USER',
      };

      const token = generateToken(payload);
      const result = verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.userId).toBe(payload.userId);
      expect(result.payload?.role).toBe(payload.role);
      expect(result.payload?.walletNumber).toBeUndefined();
    });

    it('should throw error if JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;

      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'USER',
      };

      expect(() => generateToken(payload)).toThrow(
        'JWT_SECRET environment variable is not configured'
      );
    });

    it('should use default expiration of 24h if JWT_EXPIRATION is not set', () => {
      delete process.env.JWT_EXPIRATION;

      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'USER',
      };

      const token = generateToken(payload);
      const result = verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
    });

    it('should respect custom JWT_EXPIRATION value', () => {
      process.env.JWT_EXPIRATION = '1h';

      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'USER',
      };

      const token = generateToken(payload);
      const result = verifyToken(token);

      expect(result.valid).toBe(true);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token successfully', () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'ADMIN',
        walletNumber: 'WLT88800002',
      };

      const token = generateToken(payload);
      const result = verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.payload).toEqual(
        expect.objectContaining({
          userId: payload.userId,
          role: payload.role,
          walletNumber: payload.walletNumber,
        })
      );
    });

    it('should reject an invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const result = verifyToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
      expect(result.payload).toBeUndefined();
    });

    it('should reject a token with invalid signature', () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'USER',
      };

      const token = generateToken(payload);
      
      // Change the secret to simulate invalid signature
      process.env.JWT_SECRET = 'different-secret';
      
      const result = verifyToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should reject an expired token', () => {
      // Set expiration to 1 second
      process.env.JWT_EXPIRATION = '1ms';

      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'USER',
      };

      const token = generateToken(payload);

      // Wait for token to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = verifyToken(token);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Token has expired');
          expect(result.payload).toBeUndefined();
          resolve(undefined);
        }, 10);
      });
    });

    it('should return error if JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;

      const result = verifyToken('some.token.here');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('JWT_SECRET environment variable is not configured');
      expect(result.payload).toBeUndefined();
    });

    it('should handle malformed tokens gracefully', () => {
      const malformedTokens = [
        '',
        'not-a-jwt',
        'only.two',
        'too.many.parts.here.invalid',
      ];

      malformedTokens.forEach((token) => {
        const result = verifyToken(token);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Token roundtrip', () => {
    it('should maintain payload integrity through generate and verify cycle', () => {
      const testCases: JWTPayload[] = [
        {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          role: 'USER',
          walletNumber: 'WLT88800001',
        },
        {
          userId: '987fcdeb-51a2-43f7-8765-123456789abc',
          role: 'AGENT',
          walletNumber: 'WLT77700001',
        },
        {
          userId: 'abcdef12-3456-7890-abcd-ef1234567890',
          role: 'ADMIN',
        },
      ];

      testCases.forEach((payload) => {
        const token = generateToken(payload);
        const result = verifyToken(token);

        expect(result.valid).toBe(true);
        expect(result.payload?.userId).toBe(payload.userId);
        expect(result.payload?.role).toBe(payload.role);
        expect(result.payload?.walletNumber).toBe(payload.walletNumber);
      });
    });
  });

  describe('Security requirements', () => {
    it('should generate different tokens for the same payload', async () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'USER',
        walletNumber: 'WLT88800001',
      };

      const token1 = generateToken(payload);
      
      // Wait a tiny bit to ensure different iat (issued at) timestamp
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const token2 = generateToken(payload);
      
      // Tokens should be different due to different iat
      expect(token1).not.toBe(token2);
      
      // But both should be valid
      expect(verifyToken(token1).valid).toBe(true);
      expect(verifyToken(token2).valid).toBe(true);
    });

    it('should include standard JWT claims (iat, exp)', () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'USER',
      };

      const token = generateToken(payload);
      const result = verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toHaveProperty('iat'); // issued at
      expect(result.payload).toHaveProperty('exp'); // expiration
    });
  });
});
