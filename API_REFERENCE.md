# Edge Function API Reference

These are the secure backend APIs your POS system now uses.

## 1. Calculate Sale Total

**Endpoint:** `POST /api/calculate-sale-total`

**Purpose:** Securely calculate subtotal, tax, discount, and total server-side

**Authentication:** Bearer token (JWT) required

**Request Body:**
```javascript
{
  "cartItems": [
    { "productId": 1, "qty": 2 },
    { "productId": 3, "qty": 1 }
  ],
  "discountPct": 10,              // 0-100, validated server-side
  "customerId": 5,                // Optional, for loyalty points
  "applyLoyalty": true            // Whether to redeem loyalty points
}
```

**Response (Success 200):**
```javascript
{
  "success": true,
  "subtotal": 150.00,
  "discount": 15.00,              // Applied discount amount
  "loyaltyDiscount": 5.00,        // Applied loyalty discount
  "tax": 21.75,                   // 15% tax on subtotal
  "total": 151.75,                // Final amount to charge
  "saleToken": "eyJ...",          // Secure token (send back with processSale)
  "loyaltyPointsUsed": 500        // Points redeemed if applicable
}
```

**Response (Error 400):**
```javascript
{
  "error": "Insufficient stock for product 5. Available: 3"
}
```

---

## 2. Verify Payment

**Endpoint:** `POST /api/verify-payment`

**Purpose:** Verify payment status with Paystack before recording sale

**Authentication:** Bearer token (JWT) required

**Request Body:**
```javascript
{
  "reference": "INV-ABC123",   // Paystack payment reference
  "expectedAmount": 151.75     // Amount in GHS that should have been charged
}
```

**Response (Success 200):**
```javascript
{
  "verified": true,
  "amount": 151.75,
  "currency": "GHS",
  "paidAt": "2024-04-08T10:30:00Z",
  "reference": "INV-ABC123"
}
```

**Response (Already Processed 200):**
```javascript
{
  "verified": true,
  "alreadyProcessed": true,
  "message": "This payment was already processed"
}
```

**Response (Verification Failed 400):**
```javascript
{
  "verified": false,
  "error": "Amount mismatch. Expected 151.75 GHS, got 100.00 GHS"
}
```

---

## 3. Process Sale

**Endpoint:** `POST /api/process-sale`

**Purpose:** Create sale record, update stock atomically, apply loyalty points

**Authentication:** Bearer token (JWT) required

**Request Body:**
```javascript
{
  "cartItems": [
    { "productId": 1, "name": "Widget", "price": 50.00, "qty": 2 },
    { "productId": 3, "name": "Gadget", "price": 50.00, "qty": 1 }
  ],
  "subtotal": 150.00,
  "tax": 21.75,
  "discount": 15.00,
  "loyaltyDiscount": 5.00,
  "total": 151.75,
  "paymentMethod": "cash",           // or "card", "mobile_money"
  "paystackRef": "INV-ABC123",       // Only if payment method is card/mobile_money
  "customerId": 5,                   // Optional
  "amountTendered": 200.00,          // For cash: amount customer gave
  "loyaltyPointsUsed": 500,          // Points redeemed
  "saleToken": "eyJ..."              // Security token from calculate-sale-total
}
```

**Response (Success 200):**
```javascript
{
  "success": true,
  "saleId": 42,
  "saleRef": "INV-XYZ789",
  "total": 151.75,
  "paymentRef": "INV-ABC123"  // Paystack ref if credit/mobile
}
```

**Response (Partial Failure 400):**
```javascript
{
  "success": false,
  "saleId": 42,
  "saleRef": "INV-XYZ789",
  "errors": [
    "Insufficient stock for Widget. Available: 1, Requested: 2"
  ],
  "processed": 1,
  "total": 2,
  "message": "1 of 2 items processed"
}
```

**Response (Auth Error 401):**
```javascript
{
  "error": "Invalid token"
}
```

---

## Frontend Integration Example

```javascript
// Step 1: Calculate totals
const calcResponse = await fetch('/api/calculate-sale-total', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    cartItems: cart,
    discountPct: 10,
    customerId: selectedCustomer?.id,
    applyLoyalty: false
  })
});

const calcData = await calcResponse.json();
const { subtotal, tax, discount, total, saleToken } = calcData;

// Step 2a: For cash - process immediately
if (paymentMethod === 'cash') {
  const processResponse = await fetch('/api/process-sale', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      cartItems: cart,
      subtotal, tax, discount,
      total,
      paymentMethod: 'cash',
      paystackRef: null,
      amountTendered: 200,
      saleToken
    })
  });
}

// Step 2b: For card/mobile - verify first
else if (paymentMethod === 'card' || paymentMethod === 'mobile_money') {
  // ... open Paystack modal ...
  // After payment callback:
  const verifyResponse = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      reference: paystackRef,
      expectedAmount: total
    })
  });
  
  if (verifyResponse.ok) {
    // Payment verified - now process sale
    const processResponse = await fetch('/api/process-sale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        cartItems: cart,
        subtotal, tax, discount,
        total,
        paymentMethod: 'card',
        paystackRef,
        saleToken
      })
    });
  }
}
```

---

## Error Handling Pattern

```javascript
async function makePaymentCall(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      // Handle based on status code
      if (response.status === 401) {
        // Re-authenticate
        window.location.href = '/auth/login.html';
      } else if (response.status === 400) {
        // Show validation error
        showToast(error.error);
      } else {
        showToast('Server error. Try again.');
      }
      return null;
    }

    return await response.json();
  } catch (err) {
    showToast('Network error: ' + err.message);
    console.error(err);
    return null;
  }
}
```

---

## Security Tokens

### `saleToken`
- Generated by `calculate-sale-total`
- Contains hashed version of: subtotal, tax, discount, total, cart items
- Used to verify amounts haven't been tampered with
- Tied to specific cart (prevents amount swapping)
- Expires after session (doesn't need explicit expiry)

### Bearer Token (JWT)
- Your Supabase auth token
- Obtained via `db.auth.getSession()`
- Expires per Supabase config (typically 1 hour)
- Refresh with `db.auth.refreshSession()` if needed

---

## Rate Limits

Currently no explicit rate limits on Edge Functions. Supabase provides:
- Standard function memory/CPU limits
- Default timeout: 10 seconds
- Recommendation: Add explicit rate limiting for login attempts

---

## Monitoring & Logs

Check Edge Function execution logs:
1. Supabase Dashboard
2. Functions → Select function
3. Logs tab
4. Look for errors named `[FRAUD ALERT]`

Common issues to monitor:
- `[FRAUD ALERT] Amount mismatch` — Someone trying to alter price
- `Insufficient stock` — Stock issues (race conditions)
- `Invalid token` — Authentication problems
- `Paystack verification failed` — Payment processor issues
