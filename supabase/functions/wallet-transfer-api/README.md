# Wallet-to-Wallet Transfer API

Supabase Edge Function for handling wallet-to-wallet money transfers.

## Endpoints

### 1. POST /wallet-to-wallet

Execute a wallet-to-wallet transfer.

**Request:**
```json
{
  "recipientWalletNumber": "WLT888xxxxx",
  "amount": 1000,
  "description": "Payment for services",
  "pin": "1234",
  "agentId": "uuid-optional"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully sent KES 1000.00 to WLT88812345. Fee: KES 5.00",
  "transactionId": "uuid",
  "receiptReference": "TXN-20240101-00001",
  "newBalance": 4995.00
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Insufficient balance. Required: KES 1005.00 (Amount: KES 1000.00 + Fee: KES 5.00), Available: KES 500.00",
  "error": "INSUFFICIENT_BALANCE"
}
```

**Error Codes:**
- `AUTH_ERROR`: User not authenticated
- `INVALID_AMOUNT`: Amount ≤ 0
- `INVALID_WALLET_FORMAT`: Wallet number format invalid
- `SENDER_WALLET_NOT_FOUND`: Sender wallet missing
- `RECIPIENT_WALLET_NOT_FOUND`: Recipient wallet missing
- `SELF_TRANSFER`: Attempting to send to own wallet
- `INSUFFICIENT_BALANCE`: Not enough funds
- `INVALID_PIN`: Incorrect transaction PIN
- `ACCOUNT_LOCKED`: Too many failed PIN attempts
- `PIN_VALIDATION_ERROR`: PIN validation failed
- `DEDUCTION_ERROR`: Failed to deduct from sender
- `CREDIT_ERROR`: Failed to credit recipient

### 2. GET /history

Retrieve transfer history for the authenticated user.

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 50, max: 100)
- `offset` (optional): Number of records to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "type": "send_money",
      "amount": -1000,
      "fee": 5,
      "balance_after": 4995,
      "description": "Sent to WLT88812345",
      "reference": "WLT88812345",
      "receipt_reference": "TXN-20240101-00001",
      "status": "completed",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 1
}
```

### 3. POST /validate-recipient

Validate a recipient wallet number and retrieve the recipient's name.

**Request:**
```json
{
  "walletNumber": "WLT88812345"
}
```

**Response (Valid):**
```json
{
  "valid": true,
  "name": "John Doe"
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "error": "Recipient wallet not found. Please check the wallet number."
}
```

## Authentication

All endpoints require authentication via the `Authorization` header:

```
Authorization: Bearer <supabase-access-token>
```

## Fee Structure

Transaction fees are calculated as follows:
- **Formula**: 0.5% of transfer amount
- **Minimum fee**: KES 5
- **Maximum fee**: KES 50

Examples:
- Transfer KES 100 → Fee: KES 5 (minimum)
- Transfer KES 2,000 → Fee: KES 10 (0.5%)
- Transfer KES 15,000 → Fee: KES 50 (maximum)

## Deployment

Deploy this function using the Supabase CLI:

```bash
supabase functions deploy wallet-transfer-api
```

Set the required environment variables in the Supabase dashboard:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key

## Testing

Test the endpoint using curl:

```bash
# Execute transfer
curl -X POST https://your-project.supabase.co/functions/v1/wallet-transfer-api/wallet-to-wallet \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientWalletNumber": "WLT88812345",
    "amount": 1000,
    "pin": "1234"
  }'

# Get transfer history
curl -X GET "https://your-project.supabase.co/functions/v1/wallet-transfer-api/history?limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Validate recipient
curl -X POST https://your-project.supabase.co/functions/v1/wallet-transfer-api/validate-recipient \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"walletNumber": "WLT88812345"}'
```

## Requirements Mapping

This API implementation satisfies the following requirements from the wallet-to-wallet-transfer spec:

- **Requirement 1**: Wallet Number Validation (1.1, 1.2, 1.4, 1.5)
- **Requirement 2**: Transaction PIN Verification (2.1, 2.2, 2.3, 2.6)
- **Requirement 3**: Balance Validation (3.1, 3.2, 3.4, 3.5)
- **Requirement 4**: Atomic Balance Updates (4.1, 4.2, 4.3, 4.4)
- **Requirement 5**: Transaction Record Creation (5.1, 5.2, 5.3, 5.4, 5.6, 5.7)
- **Requirement 6**: Transaction Fee Calculation (6.1, 6.2, 6.3)
- **Requirement 7**: Agent Commission Support (7.1, 7.2, 7.3, 7.4)
- **Requirement 8**: Real-Time Balance Updates (8.1)
- **Requirement 9**: Error Handling and Rollback (9.1, 9.2, 9.3, 9.4, 9.5)
- **Requirement 10**: Transfer History and Receipt (10.1, 10.2, 10.3, 10.4, 10.5)
