/**
 * JWT Payload Interface
 * Contains the claims that will be encoded in the JWT token
 */
export interface JWTPayload {
  userId: string;
  role: string;
  walletNumber?: string;
}

/**
 * JWT Verification Result
 * Returned when verifying a JWT token
 */
export interface JWTVerifyResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}
