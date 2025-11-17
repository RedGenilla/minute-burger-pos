# Stock In/Out Feature Updates

## Summary of Changes

### 1. Database Schema

**Added Column:** `expires_at` (DATE) to `stock_movement` table

- Only used for "in" transactions
- NULL for "out" transactions
- Run migration: `migrations/add_expires_at_column.sql`

### 2. Stock In Function Changes

#### Old Behavior:

- Manual date entry required
- Fields: Date, Quantity, Cost

#### New Behavior:

- **Auto-stamped transaction date/time** (captured in real-time when saving)
- Fields: **Quantity, Cost, Expiration Date**
- Expiration date is **required** for all stock-in transactions

### 3. Stock Out Function Changes

#### Behavior:

- No changes to UI (still only Quantity field)
- **Logic update:** Now excludes expired stock from available inventory
- Validation: Can only deduct from non-expired stock

### 4. Inventory Calculation Logic

#### Key Changes:

```javascript
// Excludes expired ingredients from current stock
const today = new Date();
today.setHours(0, 0, 0, 0);

if (m.type === "in") {
  const exp = m.expires_at ? new Date(m.expires_at) : null;
  if (!exp || exp >= today) {
    // Only count unexpired stock
    summary[m.ingredient_id].quantity += Number(m.quantity);
  }
}
```

### 5. Stock Transactions Modal

#### New Display Fields:

- Name
- Category
- Type (IN/OUT)
- **Date** (transaction timestamp - auto-generated)
- **Expiration** (shows for Stock In only, "-" for Stock Out)
- Quantity
- Cost

### 6. Benefits

✅ **Automatic timestamping** - No manual date entry, reduces errors  
✅ **Expiration tracking** - Prevents selling expired ingredients  
✅ **Inventory accuracy** - Real-time calculations exclude expired stock  
✅ **Menu item auto-disable** - Menu items become inactive when ingredients expire  
✅ **Compliance ready** - Track expiration for food safety regulations

### 7. Migration Steps

1. **Run SQL Migration:**

   ```sql
   -- Execute in Supabase SQL Editor or via psql
   ALTER TABLE public.stock_movement
     ADD COLUMN IF NOT EXISTS expires_at DATE;
   ```

2. **Code is already updated** in `src/admin-page/ingredients.jsx`

3. **Test the feature:**
   - Stock In: Add quantity, cost, and expiration date
   - Stock Out: Verify expired items are excluded from available qty
   - Check transaction history shows both dates

### 8. Example Workflow

**Stock In:**

1. Click "Stock In" button for an ingredient
2. Enter: Quantity = 100, Cost = 500, Expiration = 2025-12-31
3. Click Confirm
4. System auto-stamps current date/time
5. Available inventory increases by 100

**Stock Out:**

1. Click "Stock Out" button
2. Enter: Quantity = 20
3. System checks available (excluding expired)
4. If sufficient, deducts 20 from inventory

**Expiration Handling:**

- If today = 2026-01-01, the above stock-in (expires 2025-12-31) won't count
- Menu items using that ingredient become Inactive automatically
