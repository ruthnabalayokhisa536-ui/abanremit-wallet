-- Auto-credit wallet when M-Pesa transaction is completed
-- This migration adds a trigger to automatically credit user wallets

CREATE OR REPLACE FUNCTION auto_credit_mpesa_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Only process if status changed to 'completed' and result_code is 0 (success)
  IF NEW.status = 'completed' AND NEW.result_code = 0 AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    RAISE NOTICE 'Auto-crediting wallet for user % with amount %', NEW.user_id, NEW.amount;
    
    -- Credit the wallet
    BEGIN
      SELECT credit_wallet(
        NEW.user_id,
        NEW.amount,
        'deposit',
        'M-Pesa deposit - ' || COALESCE(NEW.mpesa_receipt_number, NEW.checkout_request_id),
        NEW.mpesa_receipt_number
      ) INTO v_transaction_id;
      
      RAISE NOTICE 'Wallet credited successfully. Transaction ID: %', v_transaction_id;
      
      -- Create notification
      INSERT INTO notifications (user_id, title, message, type, read)
      VALUES (
        NEW.user_id,
        'Deposit Successful',
        'Your M-Pesa deposit of KES ' || NEW.amount || ' has been credited to your wallet.',
        'success',
        false
      );
      
      RAISE NOTICE 'Notification created for user %', NEW.user_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error crediting wallet: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_credit_mpesa ON mpesa_transactions;

-- Create trigger
CREATE TRIGGER trigger_auto_credit_mpesa
  AFTER UPDATE ON mpesa_transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_credit_mpesa_payment();

COMMENT ON FUNCTION auto_credit_mpesa_payment IS 'Automatically credits wallet when M-Pesa transaction is completed';
COMMENT ON TRIGGER trigger_auto_credit_mpesa ON mpesa_transactions IS 'Triggers automatic wallet credit on M-Pesa payment completion';
