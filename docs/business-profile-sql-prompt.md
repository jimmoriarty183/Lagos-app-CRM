Use this prompt in Supabase SQL Assistant or your DB workflow:

```text
Update the existing public.businesses table for a Next.js + Supabase app.

Requirements:
1. Add nullable text columns:
   - business_phone
   - business_address
   - business_segment
   - business_website
2. Do not drop, rename, or recreate existing columns.
3. Keep existing data untouched.
4. Add a check constraint for business_segment so it only allows these values:
   - Cleaning company
   - Retail store
   - Online shop
   - Fashion and tailoring
   - Beauty and salon
   - Food and bakery
   - Electronics and repair
   - Home services
   - Pharmacy and health shop
   - Wholesale and distribution
5. Allow NULL for business_segment.
6. Return the final SQL only, with no explanation.
```
