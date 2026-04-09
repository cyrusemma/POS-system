# 🚀 Implementation Checklist

## Phase 1: Setup (Do this first)

### Prerequisites
- [ ] Have your Supabase project URL
- [ ] Have your Supabase Service Role Key (from Settings → API)
- [ ] Have your Paystack Live Secret Key (from Settings → API Keys)
- [ ] Node.js installed (or npm)
- [ ] Terminal/Command prompt access

### Installation
```bash
npm install -g supabase
```
- [ ] Supabase CLI installed
- [ ] Can run `supabase --version` in terminal

### Configuration
- [ ] Copied `.env.local.example` to `.env.local`
- [ ] Filled in SUPABASE_URL (you have: https://ngjtygpuykvzlnnjqmdo.supabase.co)
- [ ] Filled in SUPABASE_SERVICE_ROLE_KEY
- [ ] Filled in PAYSTACK_SECRET_KEY
- [ ] `.env.local` file is in `.gitignore` ✅

---

## Phase 2: Authentication (5 min)

### Login to Supabase
```bash
supabase login
```
- [ ] Logged in successfully
- [ ] Can see your project listed in `supabase projects list`

---

## Phase 3: Deploy Functions (5 min)

### Deploy calculate-sale-total
```bash
supabase functions deploy calculate-sale-total
```
- [ ] ✓ Function deployed (or "Already deployed")

### Deploy verify-payment
```bash
supabase functions deploy verify-payment
```
- [ ] ✓ Function deployed

### Deploy process-sale
```bash
supabase functions deploy process-sale
```
- [ ] ✓ Function deployed

### Verify Deployment
- [ ] Open Supabase Dashboard → Functions
- [ ] See all 3 functions listed
- [ ] No errors in recent invocations

---

## Phase 4: Enable RLS (5 min)

### Option A: SQL Editor (Easiest)
1. Open Supabase Dashboard → SQL Editor
2. New query
3. Copy **entire content** of `supabase/rls-policies.sql`
4. Paste into SQL editor
5. Click "Run"

- [ ] RLS policies applied
- [ ] No SQL errors

### Option B: Via Dashboard
- [ ] Open each table below
- [ ] Click RLS button (top-right)
- [ ] Enable RLS

Tables to enable RLS:
- [ ] profiles
- [ ] products
- [ ] categories
- [ ] sales
- [ ] sale_items
- [ ] customers
- [ ] inventory_log

---

## Phase 5: Test Core Functions (10 min)

### Test 1: Browser can't modify prices
1. Open POS system in browser
2. Log in as cashier
3. Add product to cart
4. Open DevTools (F12) → Console
5. Type: `document.getElementById('discountPct').value = 99`
6. Click "Charge"
7. - [ ] Discount applied is NOT 99% (server overrides)

### Test 2: Cash payment works
1. POS system
2. Add product
3. Select "Cash"
4. Set amount tendered
5. Click Charge
6. - [ ] Receipt shown
7. - [ ] Check Supabase: Dashboard → sale_items (sale created)

### Test 3: Card payment works
1. POS system
2. Add product
3. Select "Card"
4. Click Charge
5. Paystack modal opens
6. Use test card: **4111 1111 1111 1111**
7. Exp: Any future date
8. OTP: 123456
9. - [ ] Payment processed
10. - [ ] Receipt shown
11. - [ ] Check Supabase: sale created with paystack_ref

### Test 4: RLS blocks unauthorized access
1. Log in as Cashier A
2. Open DevTools → Console
3. Get another cashier's ID from your database
4. Run: `db.from('sales').select('*').eq('cashier_id', 'other-id').single()`
5. - [ ] Returns error or empty (RLS blocks it)

### Test 5: Mobile money payment works
1. POS system
2. Add product
3. Select "MoMo"
4. Click Charge
5. Paystack modal opens (with mobile_money only)
6. Use test MoMo
7. - [ ] Payment processed

---

## Phase 6: Final Verification (5 min)

### Code Review
- [ ] Read `SECURITY_FIXES_SUMMARY.md` to understand what changed
- [ ] Reviewed Edge Function code for security issues
- [ ] Verified RLS policies make sense

### Git Status
```bash
git status
```
- [ ] Shows modified: `cashier/pos.html`
- [ ] Shows new: `supabase/` folder with 3 functions
- [ ] `.env.local` NOT in git status (it's in .gitignore)

### Safe to Commit
```bash
git add .
git commit -m "Security fixes: server-side pricing, payment verification, RLS policies"
```
- [ ] Changes committed
- [ ] `.env.local` is NOT committed ✅

---

## Phase 7: Production Ready (Optional)

### Set Environment Variables in Supabase
1. Supabase Dashboard → Functions → Settings → Environment Variables
2. Add:
   - SUPABASE_URL = `https://ngjtygpuykvzlnnjqmdo.supabase.co`
   - PAYSTACK_SECRET_KEY = `sk_live_...`
3. - [ ] Variables saved

### Monitoring Setup
- [ ] Bookmarked Supabase Function logs page
- [ ] Bookmarked Paystack transaction dashboard
- [ ] Set up email alerts for function errors (if available)

### Documentation
- [ ] Printed or saved `START_HERE.md` for quick reference
- [ ] Saved `SECURITY_DEPLOYMENT_GUIDE.md` for troubleshooting
- [ ] Shared `README_SECURITY_COMPLETE.md` with team

---

## ✅ Completion Checklist

When you see all these checked, you're done:

- [ ] All 3 Edge Functions deployed
- [ ] RLS enabled on all 7 tables
- [ ] Pricing test passed (DevTools can't modify prices)
- [ ] Cash payment tested
- [ ] Card payment tested
- [ ] Mobile money payment tested
- [ ] RLS test passed (user can't see other users' data)
- [ ] Changes committed to git (without `.env.local`)
- [ ] Bookmarked documentation files
- [ ] Told team about the changes

---

## 🆘 If Something Breaks

### Functions not deploying
```bash
supabase functions list
# Check if functions exist
```

### 404 errors in POS
- [ ] Verify function names in code match deployed functions
- [ ] Check POS is calling `/api/function-name` (not full URL)

### Payment not verifying
- [ ] Verify PAYSTACK_SECRET_KEY is set correctly
- [ ] Check it's the LIVE key (starts with `sk_live_`)
- [ ] Look at Supabase logs for Paystack API errors

### RLS blocking legitimate access
- [ ] Run RLS policies again (they're idempotent)
- [ ] Check user role in profiles table
- [ ] Disable RLS temporarily to debug, then re-enable

### Need detailed help
- [ ] Read `SECURITY_DEPLOYMENT_GUIDE.md` (has full troubleshooting)
- [ ] Check Supabase function logs for errors
- [ ] Google the error message + "Supabase"

---

## 🎉 Success Markers

You'll know it's working when:
✅ POS system still works (no major breakage)
✅ Price can't be modified in browser
✅ All payment methods work
✅ Sales appear in database
✅ Loyalty points apply correctly
✅ No cashier can see other cashiers' sales
✅ No error spam in console

---

## 📞 Quick Reference

| Command | Purpose |
|---------|---------|
| `supabase login` | Authenticate with Supabase |
| `supabase functions list` | See deployed functions |
| `supabase functions deploy NAME` | Deploy a function |
| `git status` | See what changed |
| `git commit -m "msg"` | Save changes |

---

## 🏁 Start Here

1. Read: `START_HERE.md` (overview)
2. Read: `DEPLOY_NOW.md` (quick steps)
3. Follow: This checklist
4. Reference: `SECURITY_DEPLOYMENT_GUIDE.md` (if stuck)

**Estimated total time: 25-30 minutes**

Good luck! You're securing a real payment system - well done! 🔒
