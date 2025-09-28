import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[CREATE-PAYMENT] Function started");

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { invoiceId } = await req.json();
    console.log("[CREATE-PAYMENT] Invoice ID:", invoiceId);
    
    if (!invoiceId) {
      throw new Error("Invoice ID is required");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header is required");
    }

    console.log("[CREATE-PAYMENT] Authenticating user");
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error("[CREATE-PAYMENT] Auth error:", authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    const user = data.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    
    console.log("[CREATE-PAYMENT] User authenticated:", user.id);

    // Get invoice details
    console.log("[CREATE-PAYMENT] Fetching invoice details");
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error("[CREATE-PAYMENT] Invoice fetch error:", invoiceError);
      throw new Error(`Failed to fetch invoice: ${invoiceError.message}`);
    }
    
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    console.log("[CREATE-PAYMENT] Invoice found:", {
      id: invoice.id,
      status: invoice.status,
      client_signed: !!invoice.client_signed_at,
      vendor_signed: !!invoice.vendor_signed_at,
      client_id: invoice.client_id,
      total_amount: invoice.total_amount
    });

    // Verify both parties have signed
    if (!invoice.client_signed_at || !invoice.vendor_signed_at) {
      console.log("[CREATE-PAYMENT] Signature status - Client:", !!invoice.client_signed_at, "Vendor:", !!invoice.vendor_signed_at);
      throw new Error("Both parties must sign before payment can be processed");
    }

    // Verify user is authorized (client)
    if (user.id !== invoice.client_id) {
      console.log("[CREATE-PAYMENT] Authorization failed - User:", user.id, "Client:", invoice.client_id);
      throw new Error("Only the client can initiate payment");
    }

    console.log("[CREATE-PAYMENT] Initializing Stripe");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, { 
      apiVersion: "2025-08-27.basil" 
    });
    
    // Check if customer exists
    console.log("[CREATE-PAYMENT] Checking for existing Stripe customer");
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-PAYMENT] Found existing customer:", customerId);
    } else {
      console.log("[CREATE-PAYMENT] No existing customer found, will create new one");
    }

    // Get frontend URL from environment
    const frontendUrl = Deno.env.get("FRONTEND_URL") || req.headers.get("origin") || "https://localhost:3000";
    console.log("[CREATE-PAYMENT] Using frontend URL:", frontendUrl);

    // Create payment session
    console.log("[CREATE-PAYMENT] Creating Stripe checkout session");
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
      success_url: `${frontendUrl}/payment-success?invoice_id=${invoiceId}`,
      cancel_url: `${frontendUrl}/payment-canceled?invoice_id=${invoiceId}`,
      metadata: {
        invoice_id: invoiceId,
        vendor_payout_amount: invoice.vendor_payout_amount.toString(),
        service_fee_amount: invoice.service_fee_amount.toString(),
      },
    });

    console.log("[CREATE-PAYMENT] Checkout session created:", session.id);

    // Update invoice with payment intent
    console.log("[CREATE-PAYMENT] Updating invoice status");
    const { error: updateError } = await supabaseClient
      .from('invoices')
      .update({ 
        payment_intent_id: session.payment_intent,
        status: 'payment_processing'
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error("[CREATE-PAYMENT] Invoice update error:", updateError);
      throw new Error(`Failed to update invoice status: ${updateError.message}`);
    }

    console.log("[CREATE-PAYMENT] Success - returning checkout URL:", session.url);
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CREATE-PAYMENT] Error:', errorMessage);
    
    // Return detailed error information for debugging
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString(),
      function: 'create-payment'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});