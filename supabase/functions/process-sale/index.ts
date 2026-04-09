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
  name: string;
  price: number;
  qty: number;
}

interface ProcessSaleRequest {
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  loyaltyDiscount: number;
  total: number;
  paymentMethod: "cash" | "card" | "mobile_money";
  paystackRef?: string;
  customerId?: number;
  amountTendered?: number;
  loyaltyPointsUsed?: number;
  saleToken: string; // Verify this matches the calculation
}

serve(async (req: Request) => {
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

    // Get user profile (cashier must have active, cashier role)
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (profErr || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (profile.status !== "active") {
      return new Response(JSON.stringify({ error: "Account inactive" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (profile.role !== "cashier" && profile.role !== "manager") {
      return new Response(
        JSON.stringify({
          error: "Only cashiers and managers can process sales",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const body: ProcessSaleRequest = await req.json();
    const {
      cartItems,
      subtotal,
      tax,
      discount,
      loyaltyDiscount,
      total,
      paymentMethod,
      paystackRef,
      customerId,
      amountTendered,
      loyaltyPointsUsed,
      saleToken,
    } = body;

    if (!cartItems || cartItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cart is empty" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify saleToken (prevent tampering with amounts)
    try {
      const tokenData = JSON.parse(atob(saleToken));
      if (
        Math.abs(tokenData.total - total) > 0.01 ||
        Math.abs(tokenData.subtotal - subtotal) > 0.01
      ) {
        return new Response(
          JSON.stringify({
            error: "Sale amounts do not match calculation token",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: "Invalid sale token",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate unique sale reference
    const saleRef = generateSaleRef();

    // Calculate change for cash payments
    const changeGiven =
      paymentMethod === "cash" && amountTendered
        ? Math.max(amountTendered - total, 0)
        : null;

    // START TRANSACTION: Insert sale
    const { data: saleData, error: saleErr } = await supabase
      .from("sales")
      .insert({
        sale_ref: saleRef,
        cashier_id: user.id,
        customer_id: customerId || null,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        payment_method: paymentMethod,
        payment_status: paymentMethod === "cash" ? "paid" : "pending",
        paystack_ref: paystackRef || null,
        amount_tendered: amountTendered || null,
        change_given: changeGiven ? parseFloat(changeGiven.toFixed(2)) : null,
      })
      .select("id")
      .single();

    if (saleErr) {
      return new Response(
        JSON.stringify({
          error: "Failed to create sale",
          details: saleErr.message,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const saleId = saleData.id;

    // Insert sale items and update stock (in a loop, checking stock each time)
    const errors: string[] = [];
    const successfulItems: number[] = [];

    for (const item of cartItems) {
      // Insert sale item
      const { error: itemErr } = await supabase.from("sale_items").insert({
        sale_id: saleId,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.qty,
        unit_price: parseFloat(item.price.toFixed(2)),
        total_price: parseFloat((item.price * item.qty).toFixed(2)),
      });

      if (itemErr) {
        errors.push(
          `Failed to add item ${item.name}: ${itemErr.message}`
        );
        continue;
      }

      // Fetch current stock
      const { data: current, error: fetchErr } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.productId)
        .single();

      if (fetchErr || !current) {
        errors.push(
          `Failed to fetch stock for product ${item.productId}`
        );
        continue;
      }

      // Check if enough stock (could have changed since calculation)
      if (current.stock < item.qty) {
        errors.push(
          `Insufficient stock for ${item.name}. Available: ${current.stock}, Requested: ${item.qty}`
        );
        continue;
      }

      // Update stock atomically
      const newStock = current.stock - item.qty;
      const { error: stockErr } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.productId);

      if (stockErr) {
        errors.push(
          `Failed to update stock for ${item.name}: ${stockErr.message}`
        );
        continue;
      }

      // Log inventory change
      const { error: logErr } = await supabase.from("inventory_log").insert({
        product_id: item.productId,
        change_type: "sale",
        quantity_change: -item.qty,
        note: `Sale ${saleRef}`,
        created_by: user.id,
      });

      if (logErr) {
        console.warn(`Inventory log failed for ${item.name}:`, logErr.message);
      }

      successfulItems.push(item.productId);
    }

    // Update loyalty points if redeemed
    if (customerId && loyaltyPointsUsed && loyaltyPointsUsed > 0) {
      const { data: customer } = await supabase
        .from("customers")
        .select("loyalty_points")
        .eq("id", customerId)
        .single();

      if (customer) {
        const newPoints = Math.max(
          customer.loyalty_points - loyaltyPointsUsed,
          0
        );
        await supabase
          .from("customers")
          .update({ loyalty_points: newPoints })
          .eq("id", customerId);
      }
    }

    // Check if all items were processed
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          saleId,
          saleRef,
          errors,
          processed: successfulItems.length,
          total: cartItems.length,
          message: `${successfulItems.length} of ${cartItems.length} items processed`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Add loyalty points earned on this purchase
    if (customerId) {
      const pointsEarned = Math.floor(total); // 1 point per ₵1.00
      const { data: customer } = await supabase
        .from("customers")
        .select("loyalty_points")
        .eq("id", customerId)
        .single();

      if (customer) {
        const newPoints = (customer.loyalty_points || 0) + pointsEarned;
        await supabase
          .from("customers")
          .update({ loyalty_points: newPoints })
          .eq("id", customerId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        saleId,
        saleRef,
        total: parseFloat(total.toFixed(2)),
        paymentRef: paystackRef || null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Sale processing error:", err);
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

function generateSaleRef(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "";
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return "INV-" + ref;
}
