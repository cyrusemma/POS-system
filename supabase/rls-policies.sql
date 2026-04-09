-- ============================================================
-- SUPABASE RLS POLICIES - POS System
-- ============================================================
-- Run these SQL commands in Supabase SQL Editor
-- Then enable RLS on each table
-- ============================================================
-- 1. PROFILES TABLE
-- Users see only their own profile
CREATE POLICY "Users see own profile" ON public.profiles FOR
SELECT USING (auth.uid() = id);
CREATE POLICY "Admins see all profiles" ON public.profiles FOR
SELECT USING (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) = 'admin'
    );
CREATE POLICY "Only admin can update profiles" ON public.profiles FOR
UPDATE USING (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) = 'admin'
    );
-- 2. PRODUCTS TABLE
-- All authenticated users can select products
CREATE POLICY "Users can view products" ON public.products FOR
SELECT USING (auth.role() = 'authenticated');
-- Only admin can insert/update/delete products
CREATE POLICY "Admin only: modify products" ON public.products FOR
INSERT,
    UPDATE,
    DELETE USING (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) = 'admin'
    );
-- 3. CATEGORIES TABLE
-- All authenticated users can view categories
CREATE POLICY "Users can view categories" ON public.categories FOR
SELECT USING (auth.role() = 'authenticated');
-- Only admin can modify categories
CREATE POLICY "Admin only: modify categories" ON public.categories FOR
INSERT,
    UPDATE,
    DELETE USING (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) = 'admin'
    );
-- 4. SALES TABLE
-- Rules:
-- - Cashiers see only their own sales
-- - Managers see all sales
-- - Admins see all sales
CREATE POLICY "Cashiers see own sales" ON public.sales FOR
SELECT USING (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) = 'cashier'
        AND cashier_id = auth.uid()
    );
CREATE POLICY "Managers and admins see all sales" ON public.sales FOR
SELECT USING (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) IN ('manager', 'admin')
    );
-- Cashiers can insert (create new sales)
CREATE POLICY "Cashiers can create sales" ON public.sales FOR
INSERT WITH CHECK (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) IN ('cashier', 'manager')
        AND cashier_id = auth.uid()
    );
-- Managers can update sales
CREATE POLICY "Managers can update sales" ON public.sales FOR
UPDATE USING (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) = 'manager'
    );
-- 5. SALE_ITEMS TABLE
-- Cashiers see only items from their sales
-- Managers see all sale items
CREATE POLICY "Cashiers see own sale items" ON public.sale_items FOR
SELECT USING (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) = 'cashier'
        AND sale_id IN (
            SELECT id
            FROM public.sales
            WHERE cashier_id = auth.uid()
        )
    );
CREATE POLICY "Managers and admins see all sale items" ON public.sale_items FOR
SELECT USING (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) IN ('manager', 'admin')
    );
-- Cashiers can insert sale items for their sales
CREATE POLICY "Cashiers can add sale items" ON public.sale_items FOR
INSERT WITH CHECK (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) IN ('cashier', 'manager')
        AND sale_id IN (
            SELECT id
            FROM public.sales
            WHERE cashier_id = auth.uid()
        )
    );
-- 6. CUSTOMERS TABLE
-- All authenticated users can view customers
-- Managers can modify customers
CREATE POLICY "Users can view customers" ON public.customers FOR
SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Cashiers and managers can insert customers" ON public.customers FOR
INSERT WITH CHECK (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) IN ('cashier', 'manager')
    );
CREATE POLICY "Cashiers and managers can update customers" ON public.customers FOR
UPDATE USING (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) IN ('cashier', 'manager')
    );
-- 7. INVENTORY_LOG TABLE
-- Only managers/admins can view
CREATE POLICY "Managers and admins see inventory logs" ON public.inventory_log FOR
SELECT USING (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) IN ('manager', 'admin')
    );
-- Admins can insert logs (though this is typically done by triggers)
CREATE POLICY "Admins can insert inventory logs" ON public.inventory_log FOR
INSERT WITH CHECK (
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
        ) = 'admin'
    );
-- ============================================================
-- AFTER RUNNING THESE POLICIES, ENABLE RLS:
-- ============================================================
-- 1. Go to Supabase Dashboard → Authentication → Policies
-- 2. Select each table and click "Enable RLS"
-- 3. Or run these commands:
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_log ENABLE ROW LEVEL SECURITY;