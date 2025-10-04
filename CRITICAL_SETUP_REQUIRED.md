# 🚨 SETUP REQUIRED: Run SQL Migration First

## The build errors are **expected** until the database migration completes.

---

## ✅ What You Need to Do (In Order)

### Step 1: Run the SQL Migration ⚡

1. Open **SQL_MIGRATION_TO_RUN.md** in this project
2. Copy the **entire SQL script** (starts with `-- Phase 2:`)
3. Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/bsowliifibqtgracbpgt/sql/new)
4. Paste and click **Run**

✅ **After this:** All TypeScript errors will disappear automatically.

---

### Step 2: Configure Stripe Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://bsowliifibqtgracbpgt.supabase.co/functions/v1/stripe-webhooks`
3. Select events:
   - `invoice.finalized`
   - `invoice.sent` 
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.voided`
   - `account.updated`
4. Copy the signing secret (starts with `whsec_`)
5. Add it as `STRIPE_WEBHOOK_SECRET` in Lovable

---

## Why the Errors Occur

The TypeScript types are generated from your **actual database**. Right now:
- ❌ `stripe_connect_id` column doesn't exist yet
- ❌ `invoice_items` table doesn't exist yet  
- ❌ `vendor_id` column on invoices doesn't exist yet

Once you run the migration → types regenerate → errors disappear.

---

## After Migration Succeeds

Reply "Migration complete" and I'll:
1. Wire the invoice UI into your Vendor & Client dashboards
2. Add the unified invoice view
3. Integrate admin invoice management
4. Run end-to-end tests

**Current Status:** ⏳ Awaiting SQL migration
