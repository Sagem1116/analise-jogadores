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

const STORAGE_KEY = "fmdatalab_role_weights_v1";

export function loadWeights(): AllRoleWeights {
  if (typeof localStorage === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

export function saveWeights(w: AllRoleWeights) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
}
