import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature', { status: 400, headers: corsHeaders });
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(`Webhook Error: ${err.message}`, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('Webhook event received:', event.type);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store webhook event for audit
    const { error: webhookError } = await supabase
      .from('stripe_webhook_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
        stripe_account_id: event.account || null,
        payload: event as any,
      });

    if (webhookError && webhookError.code !== '23505') { // Ignore duplicate key errors
      console.error('Failed to store webhook event:', webhookError);
    }

    // Handle invoice events
    if (event.type.startsWith('invoice.')) {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeInvoiceId = invoice.id;

      let status = 'draft';
      let paidAt = null;

      switch (event.type) {
        case 'invoice.finalized':
          status = 'open';
          break;
        case 'invoice.sent':
          status = 'sent';
          break;
        case 'invoice.paid':
          status = 'paid';
          paidAt = new Date(invoice.status_transitions.paid_at! * 1000).toISOString();
          break;
        case 'invoice.payment_failed':
          status = 'payment_failed';
          break;
        case 'invoice.voided':
          status = 'void';
          break;
      }

      // Update invoice in database
      const { error: updateError } = await supabase.rpc(
        'update_invoice_from_webhook',
        {
          p_stripe_invoice_id: stripeInvoiceId,
          p_status: status,
          p_paid_at: paidAt,
        }
      );

      if (updateError) {
        console.error('Failed to update invoice:', updateError);
        throw updateError;
      }

      console.log(`Invoice ${stripeInvoiceId} updated to status: ${status}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
