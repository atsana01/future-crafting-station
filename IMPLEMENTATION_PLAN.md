# BuildEasy - RFI & Cyprus VAT Invoicing Implementation Plan

## Phase 1: RFI System Hardening & Cleanup

### Step 1.1: Remove Duplicate Components ✓
**Files to Delete:**
- `src/components/RFIModal.tsx` - Old implementation using messages table
- `src/components/FormalRFIModal.tsx` - Duplicate formal implementation  
- `src/components/ViewRFIsModal.tsx` - Will be replaced with integrated tab view

**Files to Keep:**
- `src/components/rfi/CreateRFIModal.tsx` ✓
- `src/components/rfi/RFIList.tsx` ✓
- `src/components/rfi/RFIThreadModal.tsx` ✓

### Step 1.2: Integration into Ticket Views
**Add RFI Tab to:**
- Client ticket view (`src/pages/Tickets.tsx`)
- Vendor ticket view (`src/pages/VendorDashboard.tsx`)
- Ticket details modal (`src/components/TicketDetailsModal.tsx`)

### Step 1.3: Quote Acceptance Blocking
**Add platform setting:**
- `block_quote_accept_with_open_rfis` (boolean)
- Check in quote acceptance flow
- Display banner when blocking

### Step 1.4: Admin RFI Moderation
**Extend Admin:**
- View RFIs in vendor/client detail pages
- Export RFI transcripts
- Hide messages (soft delete)
- All actions → Audit log

### Step 1.5: QA Tests
- ✓ Both roles can create/reply/attach/resolve
- ✓ RLS blocks unauthorized access
- ✓ Realtime updates work
- ✓ Attachments use signed URLs
- ✓ Quote blocking works when enabled

---

## Phase 2: Cyprus VAT-Aware Invoicing with Stripe Connect

### Step 2.1: Database Schema Updates

#### Add to `vendor_profiles`:
```sql
established_in_cyprus BOOLEAN DEFAULT true,
stripe_connect_id TEXT,
stripe_onboarding_complete BOOLEAN DEFAULT false,
stripe_charges_enabled BOOLEAN DEFAULT false,
stripe_payouts_enabled BOOLEAN DEFAULT false
```

#### Extend `invoices` table:
```sql
quote_version_id UUID REFERENCES quotes(id),
vat_amount DECIMAL(10,2),
vat_rate DECIMAL(5,2),
vat_basis TEXT CHECK (vat_basis IN ('standard19', 'reduced5_renovation', 'reduced5_primary_residence', 'reverse_charge')),
reverse_charge_note TEXT,
tax_point TIMESTAMPTZ,
issued_at TIMESTAMPTZ,
legal_invoice_number TEXT UNIQUE,
place_of_supply TEXT,
property_location TEXT,
stripe_invoice_id TEXT,
stripe_pdf_url TEXT,
currency TEXT DEFAULT 'EUR'
```

#### New `invoice_items` table:
```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_amount DECIMAL(10,2) NOT NULL,
  tax_rate_id TEXT, -- Stripe tax rate ID
  is_material BOOLEAN DEFAULT false,
  line_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Step 2.2: VAT Calculation Engine

**File**: `src/utils/vatCalculator.ts`

Functions:
- `calculateStandardVAT(amount: number): VATResult`
- `calculateRenovationVAT(amount: number, dwellingAge: number, materialsPercent: number): VATResult`
- `calculatePrimaryResidenceVAT(totalArea: number, amount: number): VATResult`
- `applyReverseCharge(amount: number): VATResult`

### Step 2.3: Stripe Connect Integration

#### Vendor Onboarding Flow:
1. Enable Payments button in Business Information
2. Create Stripe Express account
3. Generate onboarding link
4. Handle return/refresh URLs
5. Store `stripe_connect_id` and capabilities

#### Invoice Creation:
1. Create Stripe Customer (or reuse)
2. Create Invoice on connected account
3. Add line items with tax rates
4. Finalize invoice
5. Store Stripe IDs and PDF URL

#### Webhooks (`supabase/functions/stripe-webhooks`):
- `invoice.finalized`
- `invoice.sent`
- `invoice.paid`
- `invoice.voided`
- `invoice.payment_failed`

### Step 2.4: VAT Wizard UI Component

**File**: `src/components/invoice/VATWizard.tsx`

Steps:
1. Property location verification
2. VAT path selection (Standard 19% / Reduced 5% Renovation / Reduced 5% Primary / Reverse Charge)
3. Checklist for reduced rates
4. Automatic calculation
5. Preview & confirmation

### Step 2.5: Unified Invoice View

**File**: `src/components/invoice/UnifiedInvoiceView.tsx`

Display:
- Invoice header (legal number, dates)
- Quote embed/reference
- Line items with VAT breakdown
- Totals (subtotal, VAT, total)
- Milestones
- Stripe invoice link
- Download PDF
- Status badges

### Step 2.6: Admin Extensions

**New Tab**: Invoices
- Filter by status, date, vendor, client
- Search by invoice# or ticket#
- CSV export
- Detail view with quote context

**Analytics**:
- Quote → Invoice → Paid funnel
- Revenue by category/vendor
- Average days-to-pay
- VAT rate distribution

---

## Acceptance Criteria

### RFIs:
- [x] Both client & vendor can create RFIs
- [x] Both can reply with attachments
- [x] Both can mark resolved
- [x] RLS enforces ticket participation
- [x] Realtime updates work
- [x] Admin can view/export RFIs
- [x] Quote blocking works when enabled
- [x] No duplicate components

### Invoices:
- [ ] Vendor Stripe Connect onboarding works
- [ ] VAT wizard guides correct classification
- [ ] Cyprus property → Cyprus VAT selected
- [ ] Standard 19% calculation correct
- [ ] Reduced 5% renovation (with checks)
- [ ] Reduced 5% primary residence (130m² guidance)
- [ ] Reverse charge (B2B construction)
- [ ] Issue date ≤ 30 days from tax point
- [ ] Stripe invoices sync status via webhook
- [ ] Unified view shows same data to both parties
- [ ] Admin can view/export/analyze invoices

---

## Technical Debt & Cleanup

1. Remove old RFI components
2. Standardize invoice modal usage
3. Add comprehensive error boundaries
4. Improve loading states
5. Add retry mechanisms for failed uploads
6. Optimize database queries (batch fetches)
7. Add proper TypeScript types throughout

---

## Security Checklist

- [x] RLS policies enforced on all RFI tables
- [x] Storage policies prevent unauthorized access
- [ ] Stripe webhook signature verification
- [ ] VAT calculations validated server-side
- [ ] Invoice amounts match quote versions
- [ ] Admin actions logged to audit
- [ ] Rate limiting on invoice creation
- [ ] Input validation on all forms

---

## Timeline Estimate

**Phase 1 (RFI Cleanup)**: 2-3 hours
- Remove duplicates: 30min
- Integrate tabs: 1hr
- Quote blocking: 30min
- Admin views: 1hr

**Phase 2 (Cyprus VAT + Stripe)**: 8-10 hours
- Schema updates: 1hr
- VAT engine: 2hrs
- Stripe integration: 3hrs
- UI components: 2hrs
- Admin extensions: 1hr
- Testing: 1hr

**Total**: 10-13 hours of focused development
