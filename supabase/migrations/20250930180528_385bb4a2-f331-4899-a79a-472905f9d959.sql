-- Step 1: Add admin role to user_type enum (this must be in its own transaction)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'user_type'::regtype) THEN
    ALTER TYPE user_type ADD VALUE 'admin';
  END IF;
END $$;