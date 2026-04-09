// @ts-ignore - Deno imports work at runtime on Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno imports work at runtime on Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Deno is available at runtime on Supabase Edge Functions
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
// @ts-ignore - Deno is available at runtime on Supabase Edge Functions
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
// @ts-ignore - Deno is available at runtime on Supabase Edge Functions
const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface VerifyPaymentRequest {
  reference: string;
  expectedAmount: number; // in GHS
}

serve(async (req: Request) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: VerifyPaymentRequest = await req.json();
    const { reference, expectedAmount } = body;

    if (!reference || !expectedAmount) {
      return new Response(
        JSON.stringify({
          error: "Missing reference or expectedAmount",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({
          error: "Paystack secret key not configured",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify with Paystack API
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!paystackResponse.ok) {
      return new Response(
        JSON.stringify({
          verified: false,
          error: "Paystack verification failed",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const paystackData = await paystackResponse.json();
    const transaction = paystackData.data;

    // Verify transaction succeeded
    if (transaction.status !== "success") {
      return new Response(
        JSON.stringify({
          verified: false,
          error: `Payment status is ${transaction.status}, not success`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify amount matches (Paystack amount is in kobo, convert to GHS)
    const paystackAmountGHS = transaction.amount / 100;
    const tolerance = 0.01; // Allow 1 pesewa difference due to rounding

    if (Math.abs(paystackAmountGHS - expectedAmount) > tolerance) {
      // SECURITY: Log this potential fraud attempt
      console.error(
        `[FRAUD ALERT] Amount mismatch for reference ${reference}. Expected: ${expectedAmount} GHS, Got: ${paystackAmountGHS} GHS`
      );

      return new Response(
        JSON.stringify({
          verified: false,
          error: `Amount mismatch. Expected ${expectedAmount} GHS, got ${paystackAmountGHS} GHS`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if this payment was already processed (prevent double-charging)
    const { data: existingSale } = await supabase
      .from("sales")
      .select("id")
      .eq("paystack_ref", reference)
      .maybeSingle();

    if (existingSale) {
      return new Response(
        JSON.stringify({
          verified: true,
          alreadyProcessed: true,
          message: "This payment was already processed",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Payment verified successfully
    return new Response(
      JSON.stringify({
        verified: true,
        amount: paystackAmountGHS,
        currency: transaction.currency,
        paidAt: transaction.paid_at,
        reference,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Verification error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
