import { supabase } from "@/integrations/supabase/client";
import { ROLE_GROUPS, ALL_ROLES } from "@/lib/roles";

export { ROLE_GROUPS, ALL_ROLES };

export type AttWeights = Record<string, { weight: number; invert?: boolean }>;
export type AllAttWeights = Record<string, AttWeights>;

const CACHE_KEY = "fmdatalab_att_weights_cache_v1";
const listeners = new Set<() => void>();
let cache: AllAttWeights | null = null;

function emit() { listeners.forEach((l) => l()); }

export function loadAttWeightsSync(): AllAttWeights {
  if (cache) return cache;
  if (typeof localStorage === "undefined") return {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); return cache!; } catch { return {}; }
}

export async function fetchAttWeightsFromDB(): Promise<AllAttWeights> {
  const { data, error } = await supabase.from("att_weights").select("role, weights");
  if (error) throw error;
  const out: AllAttWeights = {};
  for (const row of data ?? []) out[row.role as string] = (row.weights as AttWeights) ?? {};
  cache = out;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(out)); } catch {}
  emit();
  return out;
}

export async function saveAttWeights(role: string, weights: AttWeights): Promise<void> {
  const { error } = await supabase.from("att_weights").upsert({ role, weights, updated_at: new Date().toISOString() });
  if (error) throw error;
  cache = { ...(cache || {}), [role]: weights };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
  emit();
}

export async function deleteAttWeights(role: string): Promise<void> {
  const { error } = await supabase.from("att_weights").delete().eq("role", role);
  if (error) throw error;
  if (cache) { delete cache[role]; }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache || {})); } catch {}
  emit();
}

export function subscribeAttWeights(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
