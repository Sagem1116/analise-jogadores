import { supabase } from "@/integrations/supabase/client";

export const ROLE_GROUPS: Record<string, string[]> = {
  "Centre Back": [
    "Central Defender (De)", "Central Defender (St)", "Central Defender (Co)",
    "No-Nonsense Centre-Back (De)", "No-Nonsense Centre-Back (St)", "No-Nonsense Centre-Back (Co)",
    "Wide Centre-Back (De)", "Wide Centre-Back (Su)", "Wide Centre-Back (At)",
    "Ball Playing Defender (De)", "Ball Playing Defender (St)", "Ball Playing Defender (Co)",
    "Libero (De)", "Libero (Su)",
  ],
  "Fullback": [
    "Fullback (De)", "Fullback (Su)", "Fullback (At)", "Fullback (Au)",
    "Inverted Wing-Back (De)", "Inverted Wing-Back (Su)", "Inverted Wing-Back (At)", "Inverted Wing-Back (Au)",
    "No-Nonsense Full-Back (De)", "Inverted Full-Back (De)",
    "Wing-Back (De)", "Wing-Back (Su)", "Wing-Back (At)", "Wing-Back (Au)",
    "Complete Wing-Back (Su)", "Complete Wing-Back (At)",
  ],
  "Wing Back": [
    "Fullback WB (De)", "Fullback WB (Su)", "Fullback WB (At)", "Fullback WB (Au)",
    "Inverted Wing-Back WB (De)", "Inverted Wing-Back WB (Su)", "Inverted Wing-Back WB (At)", "Inverted Wing-Back WB (Au)",
    "No-Nonsense Full-Back WB (De)", "Inverted Full Back WB (De)",
    "Wing-Back WB (De)", "Wing-Back WB (Su)", "Wing-Back WB (At)", "Wing-Back WB (Au)",
    "Complete Wing-Back WB (Su)", "Complete Wing-Back WB (At)",
  ],
  "Defensive Midfielder": [
    "Ball Winning Midfielder DM (De)", "Ball Winning Midfielder DM (Su)",
    "Defensive Midfielder (De)", "Defensive Midfielder (Su)",
    "Segundo Volante (Su)", "Segundo Volante (At)",
    "Anchor (De)",
    "Deep Lying Playmaker DM (De)", "Deep Lying Playmaker DM (Su)",
    "Half Back (De)", "Roaming Playmaker DM (Su)", "Regista (Su)",
  ],
  "Centre Midfielder": [
    "Central Midfielder (De)", "Central Midfielder (Su)", "Central Midfielder (At)", "Central Midfielder (Au)",
    "Carrielero (Su)",
    "Deep Lying Playmaker CM (De)", "Deep Lying Playmaker CM (Su)",
    "Ball Winning Midfielder CM (De)", "Ball Winning Midfielder CM (Su)",
    "Box to Box CM (Su)",
    "Mezzala (Su)", "Mezzala (At)",
    "Advanced Playmaker CM (Su)", "Advanced Playmaker CM (At)",
    "Roaming Playmaker CM (Su)",
  ],
  "Wide Midfielder": [
    "Winger (Su)", "Winger (At)",
    "Inverted Winger (Su)", "Inverted Winger (At)",
    "Defensive Winger (De)", "Defensive Winger (Su)",
    "Wide Midfielder (De)", "Wide Midfielder (Su)", "Wide Midfielder (At)", "Wide Midfielder (Au)",
    "Wide Playmaker (Su)", "Wide Playmaker (At)",
    "Inside Forward (Su)", "Inside Forward (At)",
    "Advanced Playmaker Winger (Su)", "Advanced Playmaker Winger (At)",
    "Wide Target Forward (Su)", "Wide Target Forward (At)",
    "Trequartista Winger (At)", "Raumdeuter (At)",
  ],
  "Attacking Midfielder": [
    "Advanced Playmaker AM (Su)", "Advanced Playmaker AM (At)",
    "Shadow Striker (At)",
    "Attacking Midfielder (Su)", "Attacking Midfielder (At)",
    "Trequartista AM (At)", "Enganche (Su)",
  ],
  "Striker": [
    "Target Forward (Su)", "Target Forward (At)",
    "Deep Lying Forward (Su)", "Deep Lying Forward (At)",
    "Pressing Forward (De)", "Pressing Forward (Su)", "Pressing Forward (At)",
    "Poacher (At)", "Advanced Forward (At)",
    "Complete Forward (Su)", "Complete Forward (At)",
    "Trequartista Forward (At)", "False Nine (Su)",
  ],
  "Goalkeeper": [
    "Goalkeeper (De)", "Sweeper Keeper (De)", "Sweeper Keeper (Su)", "Sweeper Keeper (At)",
  ],
};

export const ALL_ROLES = Object.values(ROLE_GROUPS).flat();

export type RoleWeights = Record<string, { weight: number; invert?: boolean }>;
export type AllRoleWeights = Record<string, RoleWeights>;

const CACHE_KEY = "fmdatalab_role_weights_cache_v2";
const listeners = new Set<() => void>();
let cache: AllRoleWeights | null = null;

function emit() { listeners.forEach((l) => l()); }

export function loadWeightsSync(): AllRoleWeights {
  if (cache) return cache;
  if (typeof localStorage === "undefined") return {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); return cache!; } catch { return {}; }
}

export async function fetchWeightsFromDB(): Promise<AllRoleWeights> {
  const { data, error } = await supabase.from("role_weights").select("role, weights");
  if (error) throw error;
  const out: AllRoleWeights = {};
  for (const row of data ?? []) out[row.role as string] = (row.weights as RoleWeights) ?? {};
  cache = out;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(out)); } catch {}
  emit();
  return out;
}

export async function saveRoleWeights(role: string, weights: RoleWeights): Promise<void> {
  const { error } = await supabase.from("role_weights").upsert({ role, weights, updated_at: new Date().toISOString() });
  if (error) throw error;
  cache = { ...(cache || {}), [role]: weights };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
  emit();
}

export async function deleteRoleWeights(role: string): Promise<void> {
  const { error } = await supabase.from("role_weights").delete().eq("role", role);
  if (error) throw error;
  if (cache) { delete cache[role]; }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache || {})); } catch {}
  emit();
}

export function subscribeWeights(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
