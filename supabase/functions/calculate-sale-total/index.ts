// @ts-ignore - Deno imports work at runtime on Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno imports work at runtime on Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Deno is available at runtime on Supabase Edge Functions
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
// @ts-ignore - Deno is available at runtime on Supabase Edge Functions
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CartItem {
  productId: number;
  qty: number;
}

interface CalculateTotalRequest {
  cartItems: CartItem[];
  discountPct: number;
  customerId?: number;
  applyLoyalty: boolean;
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

    // Parse request
    const body: CalculateTotalRequest = await req.json();
    const { cartItems, discountPct, customerId, applyLoyalty } = body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cart is empty or invalid" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate discount (0-100%)
    const validatedDiscountPct = Math.min(Math.max(discountPct || 0, 0), 100);

    // Fetch product prices from database (NEVER trust client)
    const productIds = cartItems.map((item) => item.productId);
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("id, price, stock")
      .in("id", productIds);

    if (prodError || !products) {
      throw new Error("Failed to fetch products: " + (prodError?.message || "Unknown error"));
    }

    // Validate stock and calculate subtotal
    let subtotal = 0;
    const productMap = new Map(products.map((p: { id: number; price: number; stock: number }) => [p.id, p]));

    for (const item of cartItems) {
      const product = productMap.get(item.productId) as { id: number; price: number; stock: number } | undefined;
      if (!product) {
        return new Response(
          JSON.stringify({
            error: `Product ${item.productId} not found`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (product.stock < item.qty) {
        return new Response(
          JSON.stringify({
            error: `Insufficient stock for product ${item.productId}. Available: ${product.stock}`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      subtotal += product.price * item.qty;
    }

    // Apply discount
    const discount = (subtotal * validatedDiscountPct) / 100;

    // Apply loyalty points if requested
    let loyaltyDiscount = 0;
    let loyaltyPointsUsed = 0;

    if (applyLoyalty && customerId) {
      const { data: customer, error: custError } = await supabase
        .from("customers")
        .select("loyalty_points")
        .eq("id", customerId)
        .single();

      if (!custError && customer && customer.loyalty_points > 0) {
        // 1 point = ₵0.01
        loyaltyDiscount = Math.min(
          customer.loyalty_points / 100,
          subtotal - discount
        );
        loyaltyPointsUsed = Math.round(loyaltyDiscount * 100);
      }
    }

    // Calculate tax (15% on subtotal after discount)
    const taxableAmount = subtotal - discount - loyaltyDiscount;
    const tax = taxableAmount * 0.15;
    const total = Math.max(taxableAmount + tax, 0);

    // Generate secure token for this calculation
    // This ties the total to this specific cart server-side
    const token_data = {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      loyaltyDiscount: parseFloat(loyaltyDiscount.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      timestamp: Date.now(),
      cartHash: hashCart(cartItems),
    };

    // Create a JWT-like token (in production, use proper JWT library)
    const tokenString = btoa(JSON.stringify(token_data));

    return new Response(
      JSON.stringify({
        success: true,
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        loyaltyDiscount: parseFloat(loyaltyDiscount.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        saleToken: tokenString, // Send this back to frontend
        loyaltyPointsUsed,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

function hashCart(items: CartItem[]): string {
  const hash = items
    .map((item) => `${item.productId}:${item.qty}`)
    .join("|");
  return btoa(hash);
}
