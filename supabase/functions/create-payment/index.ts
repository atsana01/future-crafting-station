import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { invoiceId } = await req.json();
    
    if (!invoiceId) {
      throw new Error("Invoice ID is required");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header is required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error("Invoice not found");

    // Verify both parties have signed
    if (!invoice.client_signed_at || !invoice.vendor_signed_at) {
      console.log("Signature status - Client:", !!invoice.client_signed_at, "Vendor:", !!invoice.vendor_signed_at);
      throw new Error("Both parties must sign before payment can be processed");
    }

    // Verify user is authorized (client)
    if (user.id !== invoice.client_id) {
      throw new Error("Only the client can initiate payment");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ['card', 'sepa_debit', 'bancontact', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment for completed work`,
            },
            unit_amount: Math.round(invoice.total_amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?invoice_id=${invoiceId}`,
      cancel_url: `${req.headers.get("origin")}/payment-canceled?invoice_id=${invoiceId}`,
      metadata: {
        invoice_id: invoiceId,
        vendor_payout_amount: invoice.vendor_payout_amount.toString(),
        service_fee_amount: invoice.service_fee_amount.toString(),
      },
    });

    // Update invoice with payment intent
    await supabaseClient
      .from('invoices')
      .update({ 
        payment_intent_id: session.payment_intent,
        status: 'payment_processing'
      })
      .eq('id', invoiceId);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Payment creation error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});