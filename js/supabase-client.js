// =========================================================
// Supabase client — fill these in from
// Supabase Dashboard > Project Settings > API
// =========================================================
const SUPABASE_URL = "https://xrszncsmkrvzokxtdood.supabase.co";        // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "sb_publishable_H1VgJQkTfALf9eYPatiqqA_wg6QgYJd";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- small shared helpers used across pages ----------

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statusTagClass(status) {
  const map = {
    "Operational": "tag-ok",
    "Issue Reported": "tag-warn",
    "Under Inspection": "tag-info",
    "Under Maintenance": "tag-info",
    "Out of Service": "tag-alert",
    "Retired": "tag-neutral",
    "Reported": "tag-warn",
    "Assigned": "tag-info",
    "Inspection Started": "tag-info",
    "Maintenance In Progress": "tag-info",
    "Waiting for Parts": "tag-warn",
    "Resolved": "tag-ok",
    "Closed": "tag-neutral",
    "Reopened": "tag-alert"
  };
  return map[status] || "tag-neutral";
}

function priorityTagClass(p) {
  const map = { "Low": "tag-neutral", "Medium": "tag-info", "High": "tag-warn", "Critical": "tag-alert" };
  return map[p] || "tag-neutral";
}

// Redirect to login if no active session (call on every protected page)
async function requireAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

// Fetch (or lazily create) the profile row for the current user
async function getCurrentProfile() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  let { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) {
    const { data: created } = await sb.from("profiles")
      .insert({ id: user.id, full_name: user.email.split("@")[0], role: "admin" })
      .select().single();
    profile = created;
  }
  return profile;
}

async function logHistory(asset_id, actor_name, action, details, issue_id = null) {
  await sb.from("asset_history").insert({ asset_id, issue_id, actor_name, action, details });
}

async function logout() {
  await sb.auth.signOut();
  window.location.href = "index.html";
}
