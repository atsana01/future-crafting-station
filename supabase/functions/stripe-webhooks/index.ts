import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    console.error('No signature header');
    return new Response('No signature', { status: 400 });
  }

  const body = await req.text();
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!webhookSecret) {
    console.error('No webhook secret configured');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    console.log('Webhook event received:', event.type, 'ID:', event.id);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice finalized:', invoice.id);

        await supabaseClient
          .from('invoices')
          .update({ 
            status: 'sent',
            stripe_pdf_url: invoice.invoice_pdf || null
          })
          .eq('stripe_invoice_id', invoice.id);
        break;
      }

      case 'invoice.sent': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice sent:', invoice.id);

        await supabaseClient
          .from('invoices')
          .update({ status: 'sent' })
          .eq('stripe_invoice_id', invoice.id);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice paid:', invoice.id, 'Amount:', invoice.amount_paid);

        await supabaseClient
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_intent_id: invoice.payment_intent as string || null
          })
          .eq('stripe_invoice_id', invoice.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment failed:', invoice.id);

        await supabaseClient
          .from('invoices')
          .update({ status: 'payment_failed' })
          .eq('stripe_invoice_id', invoice.id);
        break;
      }

      case 'invoice.voided': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice voided:', invoice.id);

        await supabaseClient
          .from('invoices')
          .update({ status: 'voided' })
          .eq('stripe_invoice_id', invoice.id);
        break;
      }

      case 'invoice.marked_uncollectible': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice marked uncollectible:', invoice.id);

        await supabaseClient
          .from('invoices')
          .update({ status: 'uncollectible' })
          .eq('stripe_invoice_id', invoice.id);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log('Account updated:', account.id);

        // Update vendor stripe capabilities
        await supabaseClient
          .from('vendor_profiles')
          .update({
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_onboarding_complete: account.details_submitted,
          })
          .eq('stripe_connect_id', account.id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true, eventType: event.type }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
