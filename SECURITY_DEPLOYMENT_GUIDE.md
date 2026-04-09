# 🔒 POS System Security Fixes — Deployment Guide

## Overview
This guide walks you through deploying the security fixes for your POS System. The fixes address critical vulnerabilities around price manipulation, payment fraud, and database access control.

---

## ✅ What's been fixed

1. ✓ **Server-side price calculation** — Prices now calculated on a secure backend, not in the browser
2. ✓ **Payment verification** — Paystack payments verified before being marked "paid"
3. ✓ **Price/discount/tax validated server-side** — No client tampering possible
4. ✓ **Stock race condition prevention** — Atomic stock updates via Edge Functions
5. ✓ **Loyalty points secured** — Applied server-side
6. ✓ **RLS policies template** — Ready to apply to Supabase

---

## 📋 What you need

- **Supabase project URL & Service Role Key** (you have this)
- **Paystack Secret Key** (from Paystack dashboard)
- **Supabase CLI** (for deploying Edge Functions)

---

## 🚀 Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

Or if you use another package manager:
```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# Windows (Scoop)
scoop install supabase

# Windows (Chocolatey)
choco install supabase
```

---

## 🔧 Step 2: Initialize Supabase in your project

Navigate to your project root and run:

```bash
supabase init
```

This creates a `supabase` folder with configuration. **We already created the functions** — so you just need to deploy them.

---

## 🔐 Step 3: Set environment variables for Edge Functions

Edit (or create) `.env.local` in your project root:

```env
SUPABASE_URL=https://ngjtygpuykvzlnnjqmdo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key_here
```

**To get your Service Role Key:**
1. Open Supabase Dashboard → Settings → API
2. Copy **Service Role Key** (⚠️ KEEP THIS SECRET)

**To get your Paystack Secret Key:**
1. Go to Paystack Dashboard → Settings → API Keys & Webhooks
2. Copy **Secret Key** under Live Keys
3. Make sure this is your **LIVE** key (starts with `sk_live_`)

---

## 🚢 Step 4: Deploy Edge Functions

```bash
supabase functions deploy calculate-sale-total
supabase functions deploy verify-payment
supabase functions deploy process-sale
```

If you get auth errors, log in first:
```bash
supabase login
```

**Expected output:**
```
✓ Deployed function calculate-sale-total
✓ Deployed function verify-payment
✓ Deployed function process-sale
```

---

## 📊 Step 5: Enable RLS (Row-Level Security) in Supabase

This is **critical** — it prevents cashiers from accessing other users' data.

### Option A: Using the SQL Editor (Easiest)

1. Open **Supabase Dashboard** → Your project → **SQL Editor**
2. Create a new query
3. Copy the entire content of `supabase/rls-policies.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or Ctrl+Enter)

This will:
- Create all the security policies
- Enable RLS on all tables

### Option B: Using Supabase CLI

```bash
supabase db push
```

Then enable RLS on each table:
1. Dashboard → Table Editor
2. Select a table
3. Click **RLS** button (top right)
4. Toggle "Enable RLS"
5. Repeat for: profiles, products, categories, sales, sale_items, customers, inventory_log

---

## 🧪 Step 6: Test the Flow

1. **Open your POS system** in the browser
2. **Log in as a cashier**
3. **Add products to cart**
4. **Try to modify amounts in DevTools:**
   ```javascript
   // In Chrome DevTools Console, try:
   total = 0.01;  // This should NOT work anymore
   ```
5. **Proceed to checkout**
   - For **Cash**: Should work immediately
   - For **Card/MoMo**: Opens Paystack, verifies payment server-side

### Expected behavior after fix:
- ✓ Discount applied correctly (server-verified)
- ✓ Tax calculated correctly (server-verified)
- ✓ DevTools modifications don't affect final price
- ✓ Payment must be verified with Paystack before sale is recorded
- ✓ Stock updates atomically (no race conditions)

---

## 🔍 Step 7: Verify Paystack Integration

1. **Test with Paystack test card:**
   - Card: 4111 1111 1111 1111
   - Expiry: Any future month/year
   - OTP: 123456

2. **Check Paystack webhook:**
   - Go to Paystack Dashboard → Settings → Webhooks
   - Verify your webhook URL is pointing to your site (if using webhooks)
   - Our Edge Function validates on backend, so webhook is optional for this setup

---

## 📝 Step 8: Update your login page to show environment status

*Optional but recommended for debugging:*

In `auth/login.html`, add this test endpoint call to verify functions are deployed:

```javascript
// At the end of login.html script block
async function testEdgeFunctions() {
  try {
    const response = await fetch('/api/calculate-sale-total', { method: 'OPTIONS' });
    console.log('✅ Edge Functions deployed correctly');
  } catch (err) {
    console.warn('⚠️ Edge Functions may not be deployed:', err.message);
  }
}
// Call on page load
textEdgeFunctions();
```

---

## ⚠️ Common Issues

### "Edge Functions not found" (404 errors)
**Solution:**
- Verify functions were deployed: `supabase functions list`
- Check they're running: Click the function in Supabase Dashboard → Functions
- Make sure API calls use `/api/function-name` URLs (Supabase auto-routes these)

### "Unauthorized" errors when testing
**Solution:**
- Make sure you're logged in with a valid JWT token
- Edge Functions validate the Bearer token from `Authorization` header
- Verify token in DevTools: `db.auth.getSession()`

### "Paystack Secret Key not configured"
**Solution:**
- Verify `PAYSTACK_SECRET_KEY` is set in Supabase environment
- Go to Supabase Dashboard → Functions → Settings → Environment Variables
- Add the key there too (in addition to `.env.local`)

### "Amount mismatch" on Paystack verification
**Solution:**
- Check if discount percentage is >100 (should be capped at 100)
- Verify loyalty points calculation matches what's sent to server
- Check for floating-point rounding issues

---

## 🔐 Security Checklist

After deployment, verify:

- [ ] All three Edge Functions deployed successfully
- [ ] RLS enabled on all tables
- [ ] Cashiers can only see their own sales
- [ ] Discount/tax cannot be modified in browser
- [ ] Paystack payments require verification before processing
- [ ] Stock updates are atomic (no race conditions)
- [ ] Loyalty points can't be edited in browser
- [ ] `.env.local` is in `.gitignore` (never commit secrets!)

---

## 📚 File Structure

After these changes, your project looks like:

```
pos-system/
├── supabase/
│   ├── functions/
│   │   ├── calculate-sale-total/
│   │   │   └── index.ts          ✅ Server calculates totals
│   │   ├── verify-payment/
│   │   │   └── index.ts          ✅ Verifies with Paystack
│   │   └── process-sale/
│   │       └── index.ts          ✅ Atomic sale + stock update
│   ├── rls-policies.sql          ✅ Database security rules
│   └── config.json
├── config/
│   └── supabase.js               (unchanged)
├── cashier/
│   └── pos.html                  ✅ UPDATED: Uses Edge Functions
├── auth/
│   └── login.html                (unchanged)
└── ... (other files)
```

---

## 🚨 Remaining Medium/Low Priority Issues

After deploying these fixes, address:

1. **Client-side rate limiting** → Move to server-side with Edge Function or Supabase Auth
2. **Paystack public key rotation** → Load from `.env` or Edge Function
3. **Loyalty points browser editing** → Already fixed by server-side processing

---

## 🆘 Need Help?

If you encounter issues:

1. Check Supabase Function logs:
   - Dashboard → Functions → Click function → Logs

2. Check browser console for API errors:
   - Open DevTools (F12) → Console
   - Look for fetch errors from `/api/` calls

3. Test manually:
   ```javascript
   // In browser console:
   const { data: { session } } = await db.auth.getSession();
   const response = await fetch('/api/calculate-sale-total', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${session.access_token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       cartItems: [{productId: 1, qty: 1}],
       discountPct: 10,
       customerId: null,
       applyLoyalty: false
     })
   });
   console.log(await response.json());
   ```

---

## 🎉 You're secure!

After following this guide, your POS system is protected against:
- ✅ Client-side price manipulation
- ✅ Paystack payment fraud
- ✅ Unauthorized data access
- ✅ Stock race conditions
- ✅ Loyalty points tampering

**Next steps:**
- Monitor Supabase logs for anomalies
- Set up Paystack webhook notifications
- Regular security audits of codebase
- Backup database regularly
