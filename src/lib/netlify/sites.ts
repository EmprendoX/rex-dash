import { netlify } from "./client";

const REPO_URL =
  process.env.NETLIFY_TEMPLATE_REPO_URL ||
  "https://github.com/EmprendoX/Real-Estate-X_Engl";
const REPO_BRANCH = process.env.NETLIFY_TEMPLATE_BRANCH || "main";

export interface NetlifySite {
  id: string;
  name: string;
  ssl_url: string;
  admin_url: string;
  build_settings?: {
    repo_url?: string;
    repo_branch?: string;
    env?: Record<string, string>;
  };
  updated_at?: string;
}

export interface NetlifyDeploy {
  id: string;
  state: string; // "ready" | "error" | "building" | "processing" | etc.
  created_at: string;
  updated_at: string;
  deploy_ssl_url?: string;
  branch?: string;
  error_message?: string;
  title?: string;
}

/** Creates a new Netlify site tied to the template repo, differentiated by CLIENT_ID. */
export async function createNetlifySite(params: {
  name: string;      // subdomain slug — becomes `${name}.netlify.app`
  clientId: string;  // sitios.id UUID
}): Promise<NetlifySite> {
  return netlify.post<NetlifySite>("/sites", {
    name: params.name,
    build_settings: {
      provider: "github",
      repo_url: REPO_URL,
      repo_branch: REPO_BRANCH,
      cmd: "npm run build",
      dir: ".next",
      env: {
        CLIENT_ID: params.clientId,
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      },
    },
    processing_settings: {},
  });
}

/** Triggers a new build for an existing site. */
export async function triggerBuild(siteId: string): Promise<{ id: string; deploy_id?: string }> {
  return netlify.post<{ id: string; deploy_id?: string }>(`/sites/${siteId}/builds`);
}

/** Fetches the most recent deploy for a site. */
export async function getLatestDeploy(siteId: string): Promise<NetlifyDeploy | null> {
  const list = await netlify.get<NetlifyDeploy[]>(`/sites/${siteId}/deploys?per_page=1`);
  return list[0] ?? null;
}

/** Updates a site's env var (mainly to add/rotate CLIENT_ID after creation). */
export async function updateSiteEnv(
  siteId: string,
  env: Record<string, string>,
): Promise<NetlifySite> {
  return netlify.patch<NetlifySite>(`/sites/${siteId}`, {
    build_settings: { env },
  });
}

/** Get a single site by id (for status refresh). */
export async function getSite(siteId: string): Promise<NetlifySite> {
  return netlify.get<NetlifySite>(`/sites/${siteId}`);
}

export interface NetlifyBuildHook {
  id: string;
  title: string;
  branch: string;
  url: string;
  site_id: string;
  created_at: string;
}

/**
 * Create a build hook for the site. The returned URL is what the template's
 * /admin POSTs to after a broker save, to trigger an auto-rebuild.
 * Idempotent-ish at the app level: caller should check if we already have
 * one for this site before creating a duplicate.
 */
export async function createBuildHook(
  siteId: string,
  title = "RealEX admin auto-rebuild",
  branch = "main",
): Promise<NetlifyBuildHook> {
  return netlify.post<NetlifyBuildHook>(`/sites/${siteId}/build_hooks`, {
    title,
    branch,
  });
}

export async function listBuildHooks(siteId: string): Promise<NetlifyBuildHook[]> {
  return netlify.get<NetlifyBuildHook[]>(`/sites/${siteId}/build_hooks`);
}

/**
 * Trigger a build on every provided site id with a small throttle to stay under
 * Netlify's rate limit (500 req / min per token; we go conservative). Returns
 * a per-site result so the caller can render success/failure per row.
 */
export async function rebuildBatch(
  siteIds: string[],
): Promise<Array<{ siteId: string; ok: true; deployId?: string } | { siteId: string; ok: false; error: string }>> {
  const results: Array<{ siteId: string; ok: true; deployId?: string } | { siteId: string; ok: false; error: string }> = [];
  for (const siteId of siteIds) {
    try {
      const r = await triggerBuild(siteId);
      results.push({ siteId, ok: true, deployId: r.deploy_id ?? r.id });
    } catch (err) {
      results.push({ siteId, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    // 200ms throttle → ~5 req/s → very safe under Netlify's limit.
    await new Promise((r) => setTimeout(r, 200));
  }
  return results;
}
