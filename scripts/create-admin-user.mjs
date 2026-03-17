import { createClient } from "@supabase/supabase-js";

const email = String(process.argv[2] || "").trim().toLowerCase();
const password = String(process.argv[3] || "").trim();

if (!email || !password) {
  console.error("Usage: node scripts/create-admin-user.mjs <email> <password>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    role: "ADMIN",
  },
});

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      id: data.user?.id ?? null,
      email: data.user?.email ?? email,
      created_at: data.user?.created_at ?? null,
      note: "Add this email to ADMIN_EMAILS in your environment before signing in.",
    },
    null,
    2,
  ),
);
