# 🚀 Quick Start Deployment

## What to do RIGHT NOW

### 1. Install Supabase CLI (5 min)
```bash
npm install -g supabase
```

### 2. Copy and set environment variables (2 min)
```bash
cp .env.local.example .env.local
# Edit .env.local with your actual keys
```

Get your keys:
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase Dashboard → Settings → API (copy Service Role Key)
- **PAYSTACK_SECRET_KEY**: Paystack Dashboard → Settings → API Keys & Webhooks (copy Live Secret Key)

### 3. Deploy Edge Functions (2 min)
```bash
supabase login
supabase functions deploy calculate-sale-total
supabase functions deploy verify-payment
supabase functions deploy process-sale
```

Expected output:
```
✓ Function calculate-sale-total deployed
✓ Function verify-payment deployed
✓ Function process-sale deployed
```

### 4. Enable RLS Policies (3 min)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. New query
4. Copy content of `supabase/rls-policies.sql`
5. Paste and run

Or via CLI:
```bash
supabase db push
```

### 5. Test (2 min)
- Open POS system
- Add item to cart
- Try to modify price in DevTools (should NOT work!)
- Complete a test transaction
- ✅ You're secure!

---

## What changed?

✅ **3 new Edge Functions** — Secure server-side processing
✅ **pos.html updated** — Uses Edge Functions instead of direct database access
✅ **RLS policies** — Database access control enabled
✅ **Documentation** — Deployment guides included

---

## Files you need to deploy

```
supabase/
├── functions/
│   ├── calculate-sale-total/index.ts   ← NEW
│   ├── verify-payment/index.ts          ← NEW
│   └── process-sale/index.ts            ← NEW
└── rls-policies.sql                     ← NEW (run as SQL)
```

---

## Next (Optional but recommended)

- [ ] Set up Paystack webhooks for real-time notifications
- [ ] Add server-side rate limiting for login
- [ ] Set up monitoring/alerts for Edge Function errors
- [ ] Regular security audits

---

## Questions?

See `SECURITY_DEPLOYMENT_GUIDE.md` for detailed instructions.
