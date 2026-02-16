import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  role: string;
  walletNumber?: string;
  iat?: number;
  exp?: number;
}

export interface VerifyTokenResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Generate a JWT token with the provided payload
 * @param payload - The data to encode in the token
 * @returns The signed JWT token
 */
export function generateToken(payload: JWTPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  const expiration = process.env.JWT_EXPIRATION || '24h';

  return jwt.sign(payload, secret, {
    expiresIn: expiration,
  });
}

/**
 * Verify and decode a JWT token
 * @param token - The JWT token to verify
 * @returns Object with validation result, payload (if valid), and error message (if invalid)
 */
export function verifyToken(token: string): VerifyTokenResult {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return {
      valid: false,
      error: 'JWT_SECRET environment variable is not configured',
    };
  }

  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return {
      valid: true,
      payload: decoded,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: 'Token has expired',
      };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: 'Invalid token',
      };
    }
    return {
      valid: false,
      error: 'Token verification failed',
    };
  }
}
