import { describe, it, expect, beforeEach, vi } from 'vitest';
import { balanceService } from './balance.service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('balanceService.validateTransferBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject zero amount', async () => {
    const result = await balanceService.validateTransferBalance('wallet-id', 0);
    
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Amount must be greater than 0');
  });

  it('should reject negative amount', async () => {
    const result = await balanceService.validateTransferBalance('wallet-id', -100);
    
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Amount must be greater than 0');
  });

  it('should return error when wallet not found', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.validateTransferBalance('wallet-id', 100);
    
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Wallet not found');
  });

  it('should reject transfer when balance is insufficient', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { balance: 50 },
            error: null,
          }),
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.validateTransferBalance('wallet-id', 100);
    
    expect(result.valid).toBe(false);
    expect(result.currentBalance).toBe(50);
    expect(result.fee).toBe(5); // Minimum fee
    expect(result.totalRequired).toBe(105); // 100 + 5
    expect(result.message).toContain('Insufficient balance');
    expect(result.message).toContain('Required: KES 105.00');
    expect(result.message).toContain('Available: KES 50.00');
    expect(result.message).toContain('Shortfall: KES 55.00');
  });

  it('should accept transfer when balance is sufficient', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { balance: 200 },
            error: null,
          }),
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.validateTransferBalance('wallet-id', 100);
    
    expect(result.valid).toBe(true);
    expect(result.currentBalance).toBe(200);
    expect(result.fee).toBe(5); // Minimum fee
    expect(result.totalRequired).toBe(105); // 100 + 5
    expect(result.message).toBe('Sufficient balance for transfer');
  });

  it('should accept transfer when balance exactly matches required amount', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { balance: 105 },
            error: null,
          }),
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.validateTransferBalance('wallet-id', 100);
    
    expect(result.valid).toBe(true);
    expect(result.currentBalance).toBe(105);
    expect(result.fee).toBe(5);
    expect(result.totalRequired).toBe(105);
  });

  it('should calculate correct fee for larger amounts', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { balance: 3000 },
            error: null,
          }),
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.validateTransferBalance('wallet-id', 2000);
    
    expect(result.valid).toBe(true);
    expect(result.fee).toBe(10); // 2000 * 0.005 = 10
    expect(result.totalRequired).toBe(2010); // 2000 + 10
  });

  it('should handle errors gracefully', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.validateTransferBalance('wallet-id', 100);
    
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Error validating balance');
  });
});

describe('balanceService.deductFromSender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully deduct amount and fee from sender wallet', async () => {
    const mockFrom = vi.fn()
      .mockReturnValueOnce({
        // First call: get current balance
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { balance: 1000 },
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        // Second call: update balance
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { balance: 895 }, // 1000 - 100 - 5
                error: null,
              }),
            }),
          }),
        }),
      });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.deductFromSender('wallet-id', 100, 5);
    
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(895);
    expect(result.originalBalance).toBe(1000);
  });

  it('should update timestamp when deducting from sender wallet', async () => {
    const transferStartTime = new Date();
    let capturedUpdateData: any;

    const mockFrom = vi.fn()
      .mockReturnValueOnce({
        // First call: get current balance
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { balance: 1000 },
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        // Second call: update balance
        update: vi.fn().mockImplementation((data) => {
          capturedUpdateData = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { balance: 895 },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.deductFromSender('wallet-id', 100, 5);
    
    expect(result.success).toBe(true);
    expect(capturedUpdateData).toHaveProperty('updated_at');
    
    // Verify timestamp is >= transfer start time (Requirements 4.4, 8.2, 8.3)
    const updatedAt = new Date(capturedUpdateData.updated_at);
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(transferStartTime.getTime());
  });

  it('should return error when sender wallet not found', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.deductFromSender('wallet-id', 100, 5);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Sender wallet not found');
  });

  it('should return error when update fails', async () => {
    const mockFrom = vi.fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { balance: 1000 },
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' },
              }),
            }),
          }),
        }),
      });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.deductFromSender('wallet-id', 100, 5);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to deduct from sender wallet');
  });

  it('should handle exceptions gracefully', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.deductFromSender('wallet-id', 100, 5);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Error deducting from sender');
  });
});

describe('balanceService.creditToRecipient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully credit amount to recipient wallet', async () => {
    const mockFrom = vi.fn()
      .mockReturnValueOnce({
        // First call: get current balance
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { balance: 500 },
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        // Second call: update balance
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { balance: 600 }, // 500 + 100
                error: null,
              }),
            }),
          }),
        }),
      });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.creditToRecipient('wallet-id', 100);
    
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(600);
  });

  it('should update timestamp when crediting to recipient wallet', async () => {
    const transferStartTime = new Date();
    let capturedUpdateData: any;

    const mockFrom = vi.fn()
      .mockReturnValueOnce({
        // First call: get current balance
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { balance: 500 },
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        // Second call: update balance
        update: vi.fn().mockImplementation((data) => {
          capturedUpdateData = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { balance: 600 },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.creditToRecipient('wallet-id', 100);
    
    expect(result.success).toBe(true);
    expect(capturedUpdateData).toHaveProperty('updated_at');
    
    // Verify timestamp is >= transfer start time (Requirements 4.4, 8.2, 8.3)
    const updatedAt = new Date(capturedUpdateData.updated_at);
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(transferStartTime.getTime());
  });

  it('should return error when recipient wallet not found', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.creditToRecipient('wallet-id', 100);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Recipient wallet not found');
  });

  it('should return error when update fails', async () => {
    const mockFrom = vi.fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { balance: 500 },
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' },
              }),
            }),
          }),
        }),
      });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.creditToRecipient('wallet-id', 100);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to credit recipient wallet');
  });

  it('should handle exceptions gracefully', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.creditToRecipient('wallet-id', 100);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Error crediting recipient');
  });
});

describe('balanceService.rollbackSenderDeduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully rollback sender balance', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { balance: 1000 },
          error: null,
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.rollbackSenderDeduction('wallet-id', 1000);
    
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return error when rollback fails', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.rollbackSenderDeduction('wallet-id', 1000);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to rollback sender deduction');
  });

  it('should handle exceptions gracefully', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockRejectedValue(new Error('Database error')),
      }),
    });
    
    (supabase.from as any) = mockFrom;

    const result = await balanceService.rollbackSenderDeduction('wallet-id', 1000);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Error rolling back sender deduction');
  });
});
