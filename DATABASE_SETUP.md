# Database Setup Guide

This guide will help you apply the database migration and configure your environment.

## Step 1: Set Up Environment Variables

1. **Copy the example file:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Fill in your Supabase credentials:**
   - Go to your Supabase project dashboard: https://supabase.com/dashboard
   - Navigate to **Settings → API**
   - Copy the following values:

   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # Solana (already configured for devnet)
   NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
   NEXT_PUBLIC_SOLANA_NETWORK=devnet

   # Cron Jobs
   CRON_SECRET=generate_a_random_secret_here
   ```

## Step 2: Apply the Database Migration

You have **two options** for applying the migration:

### Option A: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/20260109_update_top_3_bids.sql`:

```sql
-- Function to recalculate top 3 bids after bid deletion
CREATE OR REPLACE FUNCTION update_top_3_bids(p_auction_id UUID)
RETURNS void AS $$
BEGIN
  -- Reset all bids for auction
  UPDATE bids
  SET is_top_3 = false
  WHERE auction_id = p_auction_id;

  -- Mark top 3
  UPDATE bids
  SET is_top_3 = true
  WHERE id IN (
    SELECT id
    FROM bids
    WHERE auction_id = p_auction_id
    ORDER BY amount DESC
    LIMIT 3
  );
END;
$$ LANGUAGE plpgsql;
```

5. Click **Run** to execute the migration

### Option B: Using Supabase CLI (Advanced)

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Apply the migration:**
   ```bash
   supabase db push
   ```

## Step 3: Verify the Migration

Run this SQL query in the Supabase SQL Editor to verify the function exists:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'update_top_3_bids'
AND routine_schema = 'public';
```

Expected result: One row showing `update_top_3_bids | FUNCTION`

## Step 4: Test the Application

1. **Restart the dev server:**
   ```bash
   npm run dev
   ```

2. **Test the features:**
   - Create an auction
   - Place some bids
   - Try deleting a non-winning bid (should work)
   - Try deleting the winning bid (should fail with error)
   - Try deleting an auction with no bids (should work)
   - Try deleting an auction with bids (should fail with error)

## Step 5: Verify Security Features

Run the comprehensive test suite:

```bash
# Make sure server is running on port 3100
PORT=3100 npm run dev

# In another terminal
node test-security-no-db.js
```

Expected result: **20/20 tests pass**

## Troubleshooting

### "supabaseUrl is required" Error
- Make sure `.env.local` exists and has correct values
- Restart the dev server after adding environment variables

### "Function does not exist" Error
- The migration hasn't been applied yet
- Follow Step 2 above to create the function

### Rate Limiting Issues
- Rate limits are in-memory and reset when server restarts
- Wait 60 seconds for rate limits to clear
- In production, consider using Redis/Upstash for distributed rate limiting

### Connection Issues
- Verify your Supabase project is active
- Check that the anon key and URL are correct
- Ensure your IP is not blocked (check Supabase → Settings → Database)

## Next Steps

Once the migration is applied and environment variables are set:

1. ✅ Test DELETE endpoints with real data
2. ✅ Verify rate limiting in production
3. ✅ Monitor error logs for validation issues
4. ✅ Set up monitoring for rate limit hits
5. ✅ Deploy to production

## Production Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in Vercel/hosting platform
- [ ] Database migration applied to production database
- [ ] Rate limiting configured (consider Redis for multi-instance)
- [ ] Error monitoring set up (Sentry, LogRocket, etc.)
- [ ] CORS configured for your domain
- [ ] Generate a secure `CRON_SECRET` for settlement cascade

---

**Need help?** Check the main documentation or the test results in `SECURITY_TEST_RESULTS.md`.
