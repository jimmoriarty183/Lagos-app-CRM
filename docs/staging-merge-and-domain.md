# Staging merge + preview domain (`test.ordo.uno`)

## 1) Resolve current conflicts (PR #25)

For these files, keep **request-scoped** RPC calls (`supabaseServer`) and remove duplicated admin-RPC lines:

- `src/app/api/campaigns/read/route.ts`
- `src/app/api/inbox/mark-read/route.ts`

Conflict markers must be fully removed:

- `<<<<<<<`
- `=======`
- `>>>>>>>`

If GitHub conflict editor is noisy, replace each whole file with the latest version from `codex/fix-status-update-issues-from-database-dd63i9` and mark resolved.

## 2) Make `test.ordo.uno` stable for staging previews

This is configured in **Vercel Project Settings**, not in app code:

1. Open **Project → Settings → Domains**.
2. Open `test.ordo.uno`.
3. Set environment to **Preview**.
4. Set branch target to **staging** (or branch pattern that includes only `staging`).
5. Save.

After that, each successful `staging` preview deploy should include `test.ordo.uno`.

> Note: repository code cannot enforce custom domain attachment by itself; this mapping is controlled by Vercel project settings.

## 3) Why domain disappears sometimes

If deployment status is **Error**, Vercel may not attach custom preview alias to that failed deployment entry.
Once the next `staging` deployment is **Ready**, `test.ordo.uno` appears again.

## 4) Conflict-free blocks to keep

`src/app/api/campaigns/read/route.ts` keep:

```ts
const supabase = await supabaseServer();
const rpcResult = await supabase.rpc("mark_campaign_read", { p_campaign_id: parsedCampaignId });
```

`src/app/api/inbox/mark-read/route.ts` keep:

```ts
const campaignReadAllResult = await supabase.rpc("mark_all_campaigns_read");
```

and:

```ts
const campaignReadResult = await supabase.rpc("mark_campaign_read", {
  p_campaign_id: parsedCampaignId,
});
```

Remove duplicated `supabaseAdmin()` campaign RPC blocks if both variants appear after merge.
