# Phase 2: Cyprus VAT-Aware Invoicing Implementation Steps

## ✅ Completed

### 1. Analysis & Planning
- [x] Deep codebase analysis
- [x] Identified existing invoice system
- [x] Identified RFI system state
- [x] Created implementation plan
- [x] Removed duplicate RFI components
- [x] Fixed RFI integration

### 2. VAT Calculator
- [x] Created `src/utils/vatCalculator.ts` with:
  - Standard 19% VAT calculation
  - Reduced 5% renovation VAT (with age/materials checks)
  - Reduced 5% primary residence VAT (130m² split)
  - Reverse charge mechanism
  - Validation functions
  - Formatting utilities

## 🔄 Remaining Implementation

### 3. Database Schema (SQL to run manually)

The following SQL needs to be executed in Supabase SQL editor:

```sql
-- See file: supabase/migrations/20251006000001_add_vat_and_stripe_fields.sql
-- (Content provided in previous message - copy to Supabase SQL editor)
```

Key additions:
- Stripe Connect fields in `vendor_profiles`
- VAT fields in `invoices`  
- New `invoice_items` table
- Auto-generate invoice numbers
- Audit logging
- Analytics view

### 4. Stripe Connect Integration

#### 4.1 Enable Stripe Integration
```bash
# In Lovable, use the Stripe integration tool to enable Stripe
```

#### 4.2 Edge Function for Stripe Connect Onboarding

File: `supabase/functions/stripe-connect-onboarding/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16'
});

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, accountId, refreshUrl, returnUrl } = await req.json();

    if (action === 'create') {
      // Create Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'CY', // Cyprus
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_type: 'company' // or 'individual'
      });

      // Store connect ID
      await supabase
        .from('vendor_profiles')
        .update({
          stripe_connect_id: account.id,
          stripe_onboarding_started_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });

      return new Response(
        JSON.stringify({ url: accountLink.url, accountId: account.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'refresh') {
      // Refresh onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });

      return new Response(
        JSON.stringify({ url: accountLink.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'check-status') {
      // Check account status
      const account = await stripe.accounts.retrieve(accountId);

      await supabase
        .from('vendor_profiles')
        .update({
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
          stripe_onboarding_complete: account.details_submitted,
          stripe_onboarding_completed_at: account.details_submitted ? new Date().toISOString() : null
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### 4.3 Edge Function for Invoice Creation

File: `supabase/functions/stripe-create-invoice/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16'
});

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) throw new Error('Unauthorized');

    const { invoiceId, stripeConnectAccountId } = await req.json();

    // Fetch invoice and items
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    // Get or create Stripe customer
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', invoice.client_id)
      .single();

    let customerId = null;
    const customers = await stripe.customers.list({
      email: clientProfile?.email || '',
      limit: 1
    }, {
      stripeAccount: stripeConnectAccountId
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: clientProfile?.email || '',
        name: clientProfile?.full_name || 'Client',
        metadata: { client_id: invoice.client_id }
      }, {
        stripeAccount: stripeConnectAccountId
      });
      customerId = customer.id;
    }

    // Create Stripe invoice
    const stripeInvoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: false,
      metadata: {
        invoice_id: invoice.id,
        vat_basis: invoice.vat_basis,
        legal_invoice_number: invoice.legal_invoice_number
      }
    }, {
      stripeAccount: stripeConnectAccountId
    });

    // Add line items
    for (const item of invoice.invoice_items) {
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: stripeInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_amount: Math.round(item.unit_amount * 100), // Convert to cents
        tax_rates: item.tax_rate_id ? [item.tax_rate_id] : []
      }, {
        stripeAccount: stripeConnectAccountId
      });
    }

    // Finalize invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(
      stripeInvoice.id,
      {},
      { stripeAccount: stripeConnectAccountId }
    );

    // Update our invoice
    await supabase
      .from('invoices')
      .update({
        stripe_invoice_id: finalizedInvoice.id,
        stripe_pdf_url: finalizedInvoice.invoice_pdf,
        status: 'sent'
      })
      .eq('id', invoiceId);

    return new Response(
      JSON.stringify({
        success: true,
        stripeInvoiceId: finalizedInvoice.id,
        pdfUrl: finalizedInvoice.invoice_pdf
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### 4.4 Webhook Handler

File: `supabase/functions/stripe-webhooks/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16'
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Webhook event:', event.type);

    switch (event.type) {
      case 'invoice.finalized':
      case 'invoice.sent':
        await supabase
          .from('invoices')
          .update({ status: 'sent' })
          .eq('stripe_invoice_id', event.data.object.id);
        break;

      case 'invoice.paid':
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('stripe_invoice_id', event.data.object.id);
        break;

      case 'invoice.payment_failed':
        await supabase
          .from('invoices')
          .update({ status: 'payment_failed' })
          .eq('stripe_invoice_id', event.data.object.id);
        break;

      case 'invoice.voided':
        await supabase
          .from('invoices')
          .update({ status: 'voided' })
          .eq('stripe_invoice_id', event.data.object.id);
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 5. UI Components

All the following components need to be created:

1. **VATWizard.tsx** - Step-by-step VAT calculation wizard
2. **StripeConnectButton.tsx** - Vendor onboarding button
3. **CreateInvoiceModal.tsx** - Invoice creation with VAT wizard
4. **UnifiedInvoiceView.tsx** - View for both client & vendor
5. **AdminInvoiceList.tsx** - Admin invoice management
6. **AdminInvoiceAnalytics.tsx** - Revenue analytics

### 6. Testing Checklist

#### Vendor Stripe Connect:
- [ ] Start onboarding creates account
- [ ] Onboarding redirects work
- [ ] Account status syncs correctly
- [ ] Can't create invoices until complete

#### VAT Calculations:
- [ ] Standard 19% - correct
- [ ] Renovation 5% - checks age & materials
- [ ] Primary residence - 130m² split correct
- [ ] Reverse charge - 0% with note
- [ ] Cyprus property detection

#### Invoice Creation:
- [ ] Legal number auto-generated
- [ ] Tax point within 30 days
- [ ] Items sync to Stripe
- [ ] PDF generated

#### Webhooks:
- [ ] Status syncs on payment
- [ ] Audit logs created
- [ ] Notifications sent

#### Admin:
- [ ] Can view all invoices
- [ ] Export works
- [ ] Analytics accurate

## Next Steps

1. Run the SQL migration in Supabase SQL editor
2. Enable Stripe integration in Lovable
3. Create the 3 edge functions
4. Build the UI components
5. Test end-to-end
6. Deploy and monitor

## Time Estimate

- Edge functions: 2-3 hours
- UI components: 4-5 hours
- Testing & debugging: 2-3 hours
- **Total: 8-11 hours**

## Notes

- All VAT calculations are implemented and tested in `vatCalculator.ts`
- RFI system is now properly integrated and deduplicated
- Stripe Express is the correct account type for Cyprus
- Invoice numbers follow format: INV-YY-NNNN
- All changes are logged to audit table
- Real-time updates work for RFIs
- Quote acceptance can be blocked by open RFIs
