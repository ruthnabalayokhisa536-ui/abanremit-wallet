import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Unit Tests for Migration: Add balance_after Column
 * 
 * Feature: airtime-transaction-fix
 * Task: 1.2 Write unit tests for migration behavior
 * Requirements: 1.3, 1.4, 1.5, 5.1, 5.3
 * 
 * These tests verify the migration SQL file for adding the balance_after column
 * to the transactions table (migration: 20260217000000_add_balance_after_column.sql)
 * 
 * Test Coverage:
 * 1. Migration adds column when it doesn't exist (uses IF NOT EXISTS)
 * 2. Migration is idempotent (can run multiple times)
 * 3. Migration preserves existing transaction data (no data modification)
 * 4. Column has correct type (DECIMAL(18, 2))
 * 5. NULL values are allowed for existing records
 */

describe("Migration: Add balance_after Column to Transactions", () => {
  let migrationSQL: string;

  // Read the migration file before running tests
  try {
    migrationSQL = readFileSync(
      join(process.cwd(), "supabase/migrations/20260217000000_add_balance_after_column.sql"),
      "utf-8"
    );
  } catch (error) {
    migrationSQL = "";
  }

  it("should have migration file present", () => {
    expect(migrationSQL).toBeTruthy();
    expect(migrationSQL.length).toBeGreaterThan(0);
  });

  it("should use IF NOT EXISTS check for idempotency (Requirement 1.5)", () => {
    // Migration should check if column exists before adding it
    expect(migrationSQL).toContain("IF NOT EXISTS");
    expect(migrationSQL).toContain("information_schema.columns");
    expect(migrationSQL).toContain("table_name = 'transactions'");
    expect(migrationSQL).toContain("column_name = 'balance_after'");
  });

  it("should add column with correct type DECIMAL(18, 2) (Requirement 5.1)", () => {
    // Verify the ALTER TABLE statement specifies DECIMAL(18, 2)
    expect(migrationSQL).toContain("ALTER TABLE transactions");
    expect(migrationSQL).toContain("ADD COLUMN balance_after");
    expect(migrationSQL).toContain("DECIMAL(18, 2)");
  });

  it("should allow NULL values for backward compatibility (Requirement 5.3)", () => {
    // The column should not have NOT NULL constraint
    // This allows existing records to have NULL balance_after
    const alterTableMatch = migrationSQL.match(/ADD COLUMN balance_after[^;]+/i);
    
    expect(alterTableMatch).toBeTruthy();
    if (alterTableMatch) {
      const columnDefinition = alterTableMatch[0];
      // Should NOT contain NOT NULL constraint
      expect(columnDefinition.toLowerCase()).not.toContain("not null");
    }
  });

  it("should not modify existing data (Requirement 1.4)", () => {
    // Migration should only add column, not update or delete data
    expect(migrationSQL.toLowerCase()).not.toContain("update transactions");
    expect(migrationSQL.toLowerCase()).not.toContain("delete from transactions");
    expect(migrationSQL.toLowerCase()).not.toContain("truncate transactions");
    
    // Should only contain ALTER TABLE for adding column
    const alterCount = (migrationSQL.match(/ALTER TABLE transactions ADD COLUMN/gi) || []).length;
    expect(alterCount).toBeGreaterThanOrEqual(1);
  });

  it("should create index for performance", () => {
    // Migration should create an index on balance_after column
    expect(migrationSQL).toContain("CREATE INDEX");
    expect(migrationSQL).toContain("idx_transactions_balance_after");
    expect(migrationSQL).toContain("ON transactions(balance_after)");
    
    // Index should use IF NOT EXISTS for idempotency
    expect(migrationSQL).toContain("IF NOT EXISTS");
  });

  it("should add column documentation comment", () => {
    // Migration should add a comment explaining the column purpose
    expect(migrationSQL).toContain("COMMENT ON COLUMN");
    expect(migrationSQL).toContain("transactions.balance_after");
    expect(migrationSQL.toLowerCase()).toContain("wallet balance");
  });

  it("should handle idempotent execution (Requirement 1.5)", () => {
    // Migration uses DO block with IF NOT EXISTS check
    expect(migrationSQL).toContain("DO $");
    expect(migrationSQL).toContain("BEGIN");
    expect(migrationSQL).toContain("END $");
    
    // Should check for column existence before adding
    expect(migrationSQL).toContain("IF NOT EXISTS");
    expect(migrationSQL).toContain("SELECT 1 FROM information_schema.columns");
  });

  it("should provide feedback messages for debugging", () => {
    // Migration should use RAISE NOTICE for feedback
    expect(migrationSQL).toContain("RAISE NOTICE");
    
    // Should have messages for both scenarios
    const noticeCount = (migrationSQL.match(/RAISE NOTICE/gi) || []).length;
    expect(noticeCount).toBeGreaterThanOrEqual(2); // One for success, one for already exists
  });

  it("should reference correct requirements in comments", () => {
    // Migration should document which requirements it addresses
    expect(migrationSQL).toContain("Requirements:");
    expect(migrationSQL).toContain("1.1");
    expect(migrationSQL).toContain("1.2");
    expect(migrationSQL).toContain("1.3");
    expect(migrationSQL).toContain("1.4");
    expect(migrationSQL).toContain("1.5");
    expect(migrationSQL).toContain("5.1");
    expect(migrationSQL).toContain("5.3");
  });
});

/**
 * Migration SQL Structure Tests
 * 
 * These tests verify the migration follows best practices
 */
describe("Migration SQL Structure and Best Practices", () => {
  let migrationSQL: string;

  try {
    migrationSQL = readFileSync(
      join(process.cwd(), "supabase/migrations/20260217000000_add_balance_after_column.sql"),
      "utf-8"
    );
  } catch (error) {
    migrationSQL = "";
  }

  it("should have proper header documentation", () => {
    // Migration should have clear header explaining its purpose
    expect(migrationSQL).toContain("ADD BALANCE_AFTER COLUMN");
    expect(migrationSQL).toContain("transactions");
  });

  it("should use proper SQL formatting", () => {
    // Check for proper SQL structure
    expect(migrationSQL).toContain("ALTER TABLE");
    expect(migrationSQL).toContain("CREATE INDEX");
    expect(migrationSQL).toContain("COMMENT ON COLUMN");
  });

  it("should handle partial index for NULL values", () => {
    // Index should only include non-NULL values for efficiency
    expect(migrationSQL).toContain("WHERE balance_after IS NOT NULL");
  });

  it("should be safe to run multiple times", () => {
    // All operations should be idempotent
    const idempotentOperations = [
      "IF NOT EXISTS",
      "CREATE INDEX IF NOT EXISTS",
    ];
    
    idempotentOperations.forEach(operation => {
      expect(migrationSQL).toContain(operation);
    });
  });
});
