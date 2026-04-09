# Deploy Without CLI - Web Dashboard Method

## ✅ Working Around the CLI Issue

We'll deploy everything through the Supabase web interface instead of command line.

---

## Step 1: Create `.env.local` (2 min)

1. Copy `.env.local.example` to `.env.local`
2. Add your credentials:

```
SUPABASE_URL=https://ngjtygpuykvzlnnjqmdo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase
PAYSTACK_SECRET_KEY=sk_live_your-paystack-secret-key
```

**Get your keys:**
- **Service Role Key**: Supabase Dashboard → Settings → API → Copy "Service Role Key"
- **Paystack Secret Key**: Paystack Dashboard → Settings → API Keys & Webhooks → Live Secret Key

---

## Step 2: Deploy Edge Functions via Web (5 min)

### Function 1: `calculate-sale-total`

1. Open **Supabase Dashboard** → Your Project
2. Click **Functions** (left sidebar)
3. Click **Create a new function**
4. Name it: `calculate-sale-total`
5. Click **Create function**
6. Select the entire code and delete it
7. Open `supabase/functions/calculate-sale-total/index.ts` in your editor
8. Copy ALL the code
9. Paste it into the Supabase function editor
10. Click **Deploy**

### Function 2: `verify-payment`

Repeat the same steps:
1. Create new function: `verify-payment`
2. Copy from `supabase/functions/verify-payment/index.ts`
3. Deploy

### Function 3: `process-sale`

Repeat:
1. Create new function: `process-sale`
2. Copy from `supabase/functions/process-sale/index.ts`
3. Deploy

---

## Step 3: Set Environment Variables for Functions (3 min)

1. Still in **Supabase Dashboard**
2. Click **Functions** → **Settings** (gear icon, top right)
3. Scroll to **Environment variables**
4. Add these 3:

```
SUPABASE_URL = https://ngjtygpuykvzlnnjqmdo.supabase.co
SUPABASE_SERVICE_ROLE_KEY = (paste your service role key)
PAYSTACK_SECRET_KEY = (paste your paystack live secret key)
```

5. Click **Save**

---

## Step 4: Enable RLS Policies (5 min)

1. Supabase Dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy **entire content** of `supabase/rls-policies.sql` from your project
5. Paste into SQL editor
6. Click **Run** (or Cmd+Enter)

Wait for success message ✅

---

## Step 5: Verify Functions Are Working (2 min)

1. Supabase Dashboard → **Functions**
2. Click each function name
3. Look at **Logs** tab
4. Should show successful recent invocations
5. No errors ✅

---

## Step 6: Test Cashier Page (5 min)

1. Open your POS system in browser
2. Log in as cashier
3. Add product to cart
4. Click "Charge"
5. ✅ Should calculate total via Edge Function
6. For card payment: Complete test payment with card 4111111111111111
7. ✅ Should verify payment server-side

---

## ✅ All Done!

If all steps work:
- ✅ Edge Functions deployed
- ✅ Environment variables set
- ✅ RLS policies active
- ✅ Cashier page working
- ✅ Payment verification working
- ✅ Admin pages secured with RLS

---

## 🆘 Troubleshooting

### Functions show errors in logs
- Check environment variables are set correctly
- Verify SQL syntax in function code

### Paystack errors
- Verify `PAYSTACK_SECRET_KEY` is the LIVE key (not test)
- Check it's set in Function Settings

### RLS denies access
- Expected! That means it's working
- Verify user role in profiles table

### Checkout shows 404 errors
- Functions might not be deployed
- Check function names match API calls: `/api/calculate-sale-total`, etc.

---

## Done?

Once all steps complete:
1. Commit changes: `git add . && git commit -m "Security deployment complete"`
2. Tell your team it's live
3. Monitor Supabase function logs for issues

You're now **fully secured**! 🔒
