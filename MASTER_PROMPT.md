# POS SYSTEM — MASTER BUILD PROMPT
# Paste this entire document into Claude Code to build the full project

---

## OVERVIEW

You are building a complete, fully functional **Point of Sale (POS) System** as a student project.
Build every single file from scratch. Do not skip any page or feature.
The system must be production-quality, well-structured, and fully connected to Supabase.

---

## TECH STACK

- **Frontend:** HTML, CSS, JavaScript (no frameworks)
- **Backend & Database:** Supabase (PostgreSQL + Auth + REST API)
- **Payments:** Paystack (card + mobile money)
- **Icons:** Use inline SVG only (no icon libraries)
- **Fonts:** Google Fonts — use "Plus Jakarta Sans" for the whole project

---

## SUPABASE CREDENTIALS

```
Project URL:  https://ngjtygpuykvzlnnjqmdo.supabase.co
Anon Key:     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nanR5Z3B1eWt2emxubmpxbWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjMzNzEsImV4cCI6MjA5MDEzOTM3MX0.mo2FLZcR8i9JXmHi1D2uzwZh4wlFfvL0jBsMnyIqFlU
Project ID:   ngjtygpuykvzlnnjqmdo
```

The Supabase SDK is loaded via CDN on every HTML page:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../config/supabase.js"></script>
```

---

## DATABASE SCHEMA (already created in Supabase)

```sql
-- profiles (extends auth.users)
profiles: id (uuid, FK auth.users), name, email, role (admin/manager/cashier), status (active/inactive), created_at

-- categories
categories: id (serial), name (unique), created_at

-- products
products: id (serial), name, category_id (FK categories), price, stock, barcode (unique), status (active/inactive), created_at

-- customers
customers: id (serial), name, phone (unique), email (unique), address, loyalty_points, created_at

-- sales
sales: id (serial), sale_ref (unique), cashier_id (FK profiles), customer_id (FK customers), subtotal, tax, discount, total, payment_method (cash/mobile_money/card), payment_status (paid/pending/failed), paystack_ref, created_at

-- sale_items
sale_items: id (serial), sale_id (FK sales), product_id (FK products), product_name, quantity, unit_price, total_price

-- inventory_log
inventory_log: id (serial), product_id (FK products), change_type (sale/restock/adjustment), quantity_change, note, created_by (FK profiles), created_at
```

Auto-trigger: when a new auth user is created, a profile row is automatically inserted via `handle_new_user()` trigger.

---

## USER ROLES

Three roles exist. One login page handles all of them and redirects based on role:

| Role | Access |
|------|--------|
| admin | Everything — users, products, inventory, sales, reports, settings |
| manager | Inventory, products, reports, sales view |
| cashier | POS sales screen only |

---

## PROJECT FILE STRUCTURE

Build every file listed below:

```
pos-system/
│
├── config/
│   └── supabase.js              # Supabase client init
│
├── auth/
│   └── login.html               # Single login page for all roles
│
├── admin/
│   ├── dashboard.html           # Admin overview with stats
│   ├── users.html               # Manage users (create, edit role, deactivate)
│   ├── products.html            # Manage products (add, edit, delete)
│   ├── categories.html          # Manage product categories
│   ├── inventory.html           # Stock levels, restock, adjustment
│   ├── customers.html           # View and manage customers
│   ├── sales.html               # View all sales and transactions
│   └── reports.html             # Charts and analytics
│
├── manager/
│   ├── dashboard.html           # Manager overview
│   ├── products.html            # View/edit products
│   ├── inventory.html           # Manage stock
│   ├── customers.html           # View customers
│   └── reports.html             # Sales reports
│
├── cashier/
│   └── pos.html                 # Main POS sales screen
│
└── assets/
    ├── css/
    │   └── style.css            # Global stylesheet
    └── js/
        └── auth.js              # Auth helper (requireAuth, logout, helpers)
```

---

## DESIGN SYSTEM — VERY IMPORTANT

### Overall Aesthetic
- **Hybrid design:** Glassmorphism for hero sections + Minimalist/clean for data-heavy sections
- The contrast between glass and clean white makes the UI feel premium and unique

### Where to use Glassmorphism
- Login page (full screen glass card on dark gradient background)
- Sidebar navigation
- Dashboard stat cards
- POS checkout panel
- Any "hero" or "highlight" element

### Where to use Minimalism (clean white)
- Data tables (products, sales, users lists)
- Forms (add product, add user, etc.)
- Reports and analytics sections
- Settings pages

### Color Palette
```css
--primary:       #185FA5;
--primary-dark:  #0C447C;
--primary-light: #E6F1FB;
--accent:        #7C3AED;
--accent-light:  #EDE9FE;
--success:       #1E8449;
--warning:       #B8860B;
--danger:        #C0392B;
--dark:          #0f0c29;
--glass-bg:      rgba(255, 255, 255, 0.08);
--glass-border:  rgba(255, 255, 255, 0.18);
--text-primary:  #1a1a2e;
--text-muted:    #888;
```

### Glassmorphism CSS Rules
```css
/* Dark gradient backgrounds for glass sections */
background: linear-gradient(135deg, #0f0c29, #1a1a4e, #0d2b6b);

/* Glass cards */
background: rgba(255, 255, 255, 0.08);
border: 1px solid rgba(255, 255, 255, 0.18);
border-radius: 16px;
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);

/* Glass text */
color: #ffffff;
/* Muted glass text */
color: rgba(255, 255, 255, 0.65);

/* Glass buttons */
background: rgba(255, 255, 255, 0.15);
border: 1px solid rgba(255, 255, 255, 0.25);
color: #fff;
border-radius: 10px;
```

### Minimalist CSS Rules (for tables/forms sections)
```css
background: #ffffff;
border-radius: 12px;
box-shadow: 0 1px 6px rgba(0,0,0,0.06);
color: #1a1a2e;
border: 1px solid #eef0f4;
```

### Typography
- Font: "Plus Jakarta Sans" from Google Fonts
- Headings: font-weight 700
- Body: font-weight 400
- Labels: font-weight 600, font-size 12px, uppercase, letter-spacing 0.5px
- Currency always shown as: GH₵ X.XX

### Sidebar
- Dark glass sidebar: background #0C447C with glass nav links
- Logo/brand at top
- Nav links with SVG icons
- Active link highlighted
- Logout button at bottom
- Fixed position, 220px wide

---

## PAGE-BY-PAGE REQUIREMENTS

### 1. config/supabase.js
```javascript
const SUPABASE_URL = "https://ngjtygpuykvzlnnjqmdo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // full key
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 2. assets/js/auth.js
Must contain:
- `requireAuth(allowedRoles[])` — checks session, fetches profile, redirects if wrong role
- `logout()` — signs out and redirects to login
- `formatCurrency(amount)` — returns "GH₵ X.XX"
- `formatDate(dateStr)` — returns human readable date
- `generateSaleRef()` — returns unique "INV-XXXXXX" string

### 3. auth/login.html
- Full page dark gradient background (glassmorphism)
- Centered glass card with: logo/title, email input, password input, sign in button
- On submit: signInWithPassword → fetch profile → check status → redirect by role
- Show error messages inline (wrong password, inactive account, etc.)
- If already logged in, redirect immediately

### 4. admin/dashboard.html
Glass sidebar + minimalist main content area
Stat cards (glass style) showing:
- Total sales today (GH₵)
- Number of transactions today
- Total products
- Low stock alerts count
- Total customers
- Total users

Below stats: two sections side by side:
- Recent sales table (last 10)
- Low stock products table (stock < 10)

### 5. admin/users.html
- Table listing all profiles (name, email, role badge, status badge, created date, actions)
- "Add user" button → modal with: name, email, password, role selector
- Edit button → modal to change name, role, status
- Cannot delete the last admin (enforce this in JS)
- Uses Supabase Admin API to create users: `db.auth.admin.createUser()`

### 6. admin/products.html
- Search bar + category filter dropdown
- Products table: name, category, price, stock, barcode, status, actions
- "Add product" button → modal form
- Edit/Delete actions per row
- Delete checks if product has sales before deleting

### 7. admin/categories.html
- Simple table of categories with add/edit/delete
- Cannot delete a category that has products

### 8. admin/inventory.html
- Table of all products with current stock levels
- Low stock highlighted in red (stock < 10)
- "Restock" button per row → modal to add quantity + note
- "Adjust" button → modal to set exact quantity + reason
- All changes logged to inventory_log table

### 9. admin/customers.html
- Table of customers: name, phone, email, loyalty points, joined date
- Add/edit customer modal
- View customer's purchase history

### 10. admin/sales.html
- Table of all sales: ref, cashier name, total, payment method, status, date
- Filter by date range, payment method, cashier
- Click a row to see sale details (items breakdown) in a modal
- Export to CSV button

### 11. admin/reports.html
- Date range picker (today / this week / this month / custom)
- Summary cards: total revenue, total transactions, average sale value
- Top 5 selling products (table)
- Sales by payment method breakdown
- Cashier performance table

### 12. manager/ pages
- Same as admin pages EXCEPT users.html (managers cannot manage users)
- manager/dashboard.html shows same stats but filtered
- All pages use same sidebar but with manager nav links only

### 13. cashier/pos.html
This is the most important page. Full glassmorphism design.

**Layout:** Two-panel side by side
- Left panel (60%): Product grid
- Right panel (40%): Cart / checkout

**Left panel features:**
- Search bar (by name or barcode)
- Category filter tabs
- Product cards in a grid (name, price, stock count)
- Clicking a product adds it to cart
- Out of stock products are greyed out and unclickable

**Right panel features:**
- Cart items list (name, qty controls +/-, unit price, line total, remove button)
- Customer selector (optional — search existing or skip)
- Discount input field (percentage)
- Subtotal, Tax (15%), Discount, Total displayed
- Payment method selector: Cash / Mobile Money / Card
- "Charge" / "Checkout" button

**On Checkout (cash/mobile money):**
1. Insert sale record into `sales` table
2. Insert all cart items into `sale_items` table
3. Deduct stock from `products` table for each item
4. Log each stock deduction in `inventory_log`
5. Show success modal with receipt preview
6. Receipt shows: store name, INV ref, date/time, items, total, payment method
7. "Print Receipt" button (uses window.print())
8. "New Sale" button resets the cart

**On Checkout (card payment via Paystack):**
1. Initialize Paystack popup with amount and customer email
2. On Paystack success callback: save sale to DB with paystack_ref
3. Show receipt modal

### 14. Receipt Modal (used in pos.html)
```
================================
        MY STORE POS
================================
Receipt: INV-XXXXXX
Date: DD MMM YYYY, HH:MM
Cashier: [name]
--------------------------------
Item Name          Qty   Price
Mineral water       2   GH₵ 7.00
Coca-Cola           1   GH₵ 5.00
--------------------------------
Subtotal:          GH₵ 12.00
Tax (15%):          GH₵ 1.80
Discount:           GH₵ 0.00
TOTAL:             GH₵ 13.80
--------------------------------
Payment: Cash
--------------------------------
    Thank you for shopping!
================================
```

---

## PAYSTACK INTEGRATION

```javascript
// Load Paystack script in pos.html
// <script src="https://js.paystack.co/v1/inline.js"></script>

function payWithPaystack(email, amountGHS, onSuccess) {
  const handler = PaystackPop.setup({
    key: 'pk_test_YOUR_PAYSTACK_PUBLIC_KEY', // replace with real key
    email: email || 'customer@pos.com',
    amount: Math.round(amountGHS * 100), // Paystack uses pesewas
    currency: 'GHS',
    ref: generateSaleRef(),
    callback: function(response) {
      onSuccess(response.reference);
    },
    onClose: function() {
      console.log('Payment cancelled');
    }
  });
  handler.openIframe();
}
```

---

## AUTH FLOW

```
User visits any protected page
  → requireAuth(['admin']) called
  → checks db.auth.getSession()
  → if no session → redirect to ../auth/login.html
  → if session → fetch profile from profiles table
  → if inactive → signOut + redirect to login
  → if wrong role → redirect to correct dashboard
  → if all good → return profile object, render page
```

Every protected page starts with:
```javascript
let currentUser = null;
window.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth(['admin']); // or ['manager'] or ['admin','manager'] or ['cashier']
  if (!currentUser) return;
  loadPageData(); // then load the page data
});
```

---

## GENERAL CODING RULES

1. Every HTML file must include these scripts in `<head>`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="../config/supabase.js"></script>
   <script src="../assets/js/auth.js"></script>
   <link rel="stylesheet" href="../assets/css/style.css"/>
   <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
   ```

2. All currency displayed as `GH₵ X.XX`

3. All dates formatted as `15 Apr 2025, 02:30 PM`

4. All tables must have a loading state (show "Loading..." while fetching) and an empty state (show "No records found" when empty)

5. All modals must close when clicking outside or pressing Escape key

6. All forms must show validation errors inline before submitting

7. All Supabase errors must be caught and shown to the user in a visible alert box

8. Stock deduction on sale must be done carefully — check stock availability before completing checkout

9. Role badges: admin = blue, manager = amber, cashier = green
   Status badges: active = green, inactive = red
   Payment badges: paid = green, pending = amber, failed = red

10. The sidebar must show the current user's name and role at the bottom above the logout button

---

## BUILD ORDER

Build files in this exact order:
1. `config/supabase.js`
2. `assets/css/style.css`
3. `assets/js/auth.js`
4. `auth/login.html`
5. `admin/dashboard.html`
6. `admin/users.html`
7. `admin/products.html`
8. `admin/categories.html`
9. `admin/inventory.html`
10. `admin/customers.html`
11. `admin/sales.html`
12. `admin/reports.html`
13. `manager/dashboard.html`
14. `manager/products.html`
15. `manager/inventory.html`
16. `manager/customers.html`
17. `manager/reports.html`
18. `cashier/pos.html`

Build ALL files completely. Do not summarise or skip any file.
Each file must be fully working code, not a template or placeholder.

---

## FINAL NOTES

- The database is already set up in Supabase — do not recreate tables
- Sample products and categories are already seeded
- The `handle_new_user` trigger is already in place
- An admin account will be created manually by the student in Supabase Auth dashboard
- The Paystack public key is a placeholder — student will replace with their real key
- All pages must work correctly when opened via VS Code Live Server
- Do not use any backend framework — pure HTML/CSS/JS frontend talking directly to Supabase JS SDK
