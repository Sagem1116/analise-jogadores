// Leak-based role weights store, persisted to localStorage.
export type WeightedItem = { name: string; pct: number };
export type LeakRole = {
  id: string;
  emoji: string;
  name: string;
  subtitle?: string;
  group: string;
  attributes: WeightedItem[];
  metrics: WeightedItem[];
  note?: string;
};

const KEY = "fmdatalab_leak_roles_v2";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const LEAK_GROUPS = [
  "Centrais",
  "Laterais",
  "Médios Defensivos",
  "Médios Centro",
  "Alas",
  "Médio Ofensivo",
  "Avançados",
];

const ATT = (name: string, pct: number) => ({ name, pct });
const MET = (name: string, pct: number) => ({ name, pct });

export const LEAK_DEFAULTS: LeakRole[] = [
  // ========== Centrais ==========
  {
    id: uid(), emoji: "🧠", name: "Central Defender (Base)", group: "Centrais",
    subtitle: 'O central "normal" do FM.',
    attributes: [ATT("Positioning",18),ATT("Anticipation",16),ATT("Tackling",14),ATT("Jumping Reach",12),ATT("Strength",10),ATT("Heading",10),ATT("Concentration",8),ATT("Decisions",6),ATT("Pace",4),ATT("Acceleration",2)],
    metrics: [MET("Interceptions",30),MET("Tackles Won",25),MET("Clearances",20),MET("Headers Won",15),MET("Blocks",10)],
  },
  {
    id: uid(), emoji: "🛡️", name: "Central Defender (Defend)", group: "Centrais",
    subtitle: "Mais conservador.",
    attributes: [ATT("Positioning",20),ATT("Anticipation",16),ATT("Tackling",14),ATT("Jumping Reach",12),ATT("Strength",10),ATT("Heading",10),ATT("Concentration",10),ATT("Decisions",6),ATT("Pace",2)],
    metrics: [MET("Interceptions",35),MET("Clearances",25),MET("Tackles Won",20),MET("Headers Won",10),MET("Blocks",10)],
  },
  {
    id: uid(), emoji: "⚔️", name: "Central Defender (Stopper)", group: "Centrais",
    subtitle: "Sai da linha para atacar o portador.",
    attributes: [ATT("Tackling",20),ATT("Anticipation",15),ATT("Aggression",12),ATT("Bravery",10),ATT("Strength",10),ATT("Positioning",10),ATT("Jumping Reach",10),ATT("Heading",8),ATT("Pace",5)],
    metrics: [MET("Tackles Won",35),MET("Key Tackles",25),MET("Interceptions",15),MET("Blocks",15),MET("Clearances",10)],
  },
  {
    id: uid(), emoji: "🏃", name: "Central Defender (Cover)", group: "Centrais",
    subtitle: "Protege profundidade.",
    attributes: [ATT("Anticipation",18),ATT("Positioning",18),ATT("Pace",15),ATT("Acceleration",12),ATT("Tackling",10),ATT("Concentration",10),ATT("Decisions",7),ATT("Jumping Reach",5),ATT("Strength",5)],
    metrics: [MET("Interceptions",35),MET("Tackles Won",20),MET("Clearances",15),MET("Blocks",15),MET("Headers Won",15)],
  },
  {
    id: uid(), emoji: "🪓", name: "No-Nonsense Centre Back", group: "Centrais",
    subtitle: "O destruidor puro.",
    attributes: [ATT("Tackling",18),ATT("Strength",15),ATT("Jumping Reach",15),ATT("Heading",12),ATT("Bravery",12),ATT("Aggression",10),ATT("Positioning",10),ATT("Anticipation",8)],
    metrics: [MET("Clearances",35),MET("Headers Won",25),MET("Tackles Won",20),MET("Blocks",15),MET("Interceptions",5)],
  },
  {
    id: uid(), emoji: "🎯", name: "Ball Playing Defender", group: "Centrais",
    subtitle: "Passing + Decisions + Vision.",
    attributes: [ATT("Passing",18),ATT("Decisions",15),ATT("Positioning",14),ATT("Anticipation",12),ATT("Tackling",10),ATT("Vision",10),ATT("Composure",8),ATT("Technique",5),ATT("Jumping Reach",4),ATT("Strength",4)],
    metrics: [MET("Passes Completed",30),MET("Forward Passes",25),MET("Key Passes",15),MET("Interceptions",15),MET("Tackles Won",10),MET("Headers Won",5)],
  },
  {
    id: uid(), emoji: "🌊", name: "Wide Centre Back", group: "Centrais",
    subtitle: "Mistura central + lateral.",
    attributes: [ATT("Positioning",15),ATT("Anticipation",12),ATT("Passing",12),ATT("Pace",12),ATT("Acceleration",10),ATT("Tackling",10),ATT("Work Rate",10),ATT("Stamina",8),ATT("Crossing",6),ATT("Decisions",5)],
    metrics: [MET("Passes Completed",20),MET("Forward Passes",20),MET("Interceptions",20),MET("Tackles Won",15),MET("Crosses Completed",15),MET("Distance Covered",10)],
  },
  {
    id: uid(), emoji: "🧠", name: "Libero", group: "Centrais",
    subtitle: "Defende como central, constrói como médio.",
    attributes: [ATT("Passing",16),ATT("Decisions",15),ATT("Positioning",12),ATT("Anticipation",12),ATT("Vision",10),ATT("Tackling",10),ATT("Composure",8),ATT("Technique",7),ATT("Pace",5),ATT("Acceleration",5)],
    metrics: [MET("Passes Completed",25),MET("Forward Passes",25),MET("Interceptions",15),MET("Key Passes",15),MET("Tackles Won",10),MET("Distance Covered",10)],
  },

  // ========== Laterais ==========
  {
    id: uid(), emoji: "🔁", name: "Fullback (Base)", group: "Laterais",
    subtitle: "Lateral equilibrado.",
    attributes: [ATT("Positioning",14),ATT("Work Rate",14),ATT("Tackling",12),ATT("Anticipation",12),ATT("Stamina",10),ATT("Crossing",10),ATT("Pace",10),ATT("Acceleration",8),ATT("Decisions",5),ATT("Passing",5)],
    metrics: [MET("Tackles Won",25),MET("Interceptions",20),MET("Distance Covered",20),MET("Crosses Completed",15),MET("Presses Completed",10),MET("Sprints",10)],
  },
  {
    id: uid(), emoji: "🛡️", name: "Fullback (Defend)", group: "Laterais",
    subtitle: "Primeiro defender.",
    attributes: [ATT("Positioning",18),ATT("Tackling",15),ATT("Anticipation",15),ATT("Work Rate",12),ATT("Stamina",10),ATT("Pace",8),ATT("Strength",8),ATT("Decisions",7),ATT("Crossing",4),ATT("Passing",3)],
    metrics: [MET("Tackles Won",30),MET("Interceptions",25),MET("Presses Completed",15),MET("Distance Covered",15),MET("Clearances",10),MET("Crosses Completed",5)],
  },
  {
    id: uid(), emoji: "🚀", name: "Fullback (Attack)", group: "Laterais",
    subtitle: "Quase um ala.",
    attributes: [ATT("Crossing",18),ATT("Work Rate",15),ATT("Stamina",12),ATT("Pace",12),ATT("Acceleration",10),ATT("Anticipation",8),ATT("Positioning",8),ATT("Technique",7),ATT("Decisions",5),ATT("Passing",5)],
    metrics: [MET("Crosses Completed",25),MET("Cross Attempts",20),MET("Distance Covered",20),MET("Sprints",15),MET("Presses Completed",10),MET("Key Passes",10)],
  },
  {
    id: uid(), emoji: "🪽", name: "Wing-Back (Base)", group: "Laterais",
    subtitle: "Mais ofensivo que Fullback.",
    attributes: [ATT("Work Rate",16),ATT("Stamina",15),ATT("Crossing",15),ATT("Pace",12),ATT("Acceleration",10),ATT("Anticipation",8),ATT("Positioning",8),ATT("Decisions",6),ATT("Technique",5),ATT("Dribbling",5)],
    metrics: [MET("Distance Covered",25),MET("Crosses Completed",25),MET("Sprints",20),MET("Cross Attempts",15),MET("Presses Completed",10),MET("Key Passes",5)],
  },
  {
    id: uid(), emoji: "🌟", name: "Complete Wing-Back", group: "Laterais",
    subtitle: "O lateral total.",
    attributes: [ATT("Work Rate",15),ATT("Stamina",13),ATT("Crossing",12),ATT("Pace",10),ATT("Acceleration",10),ATT("Technique",10),ATT("Dribbling",10),ATT("Decisions",8),ATT("Passing",7),ATT("Anticipation",5)],
    metrics: [MET("Crosses Completed",20),MET("Distance Covered",20),MET("Sprints",15),MET("Key Passes",15),MET("Dribbles",15),MET("Presses Completed",15)],
  },
  {
    id: uid(), emoji: "🔄", name: "Inverted Wing-Back", group: "Laterais",
    subtitle: "Vive de Passing, Decisions, Positioning e Vision.",
    attributes: [ATT("Passing",18),ATT("Decisions",16),ATT("Positioning",14),ATT("Vision",12),ATT("Anticipation",10),ATT("Work Rate",10),ATT("Technique",8),ATT("Stamina",6),ATT("Pace",4),ATT("Acceleration",2)],
    metrics: [MET("Passes Completed",30),MET("Forward Passes",25),MET("Key Passes",15),MET("Presses Completed",15),MET("Interceptions",10),MET("Distance Covered",5)],
  },
  {
    id: uid(), emoji: "🔄", name: "Inverted Full-Back", group: "Laterais",
    subtitle: "Mais defensivo que o IWB.",
    attributes: [ATT("Positioning",18),ATT("Passing",16),ATT("Decisions",15),ATT("Anticipation",12),ATT("Tackling",10),ATT("Vision",10),ATT("Work Rate",8),ATT("Technique",6),ATT("Pace",5)],
    metrics: [MET("Passes Completed",30),MET("Interceptions",25),MET("Tackles Won",15),MET("Forward Passes",15),MET("Presses Completed",10),MET("Distance Covered",5)],
  },
  {
    id: uid(), emoji: "🪓", name: "No-Nonsense Full-Back", group: "Laterais",
    subtitle: "Destruidor da ala.",
    attributes: [ATT("Tackling",18),ATT("Positioning",16),ATT("Strength",12),ATT("Anticipation",12),ATT("Work Rate",10),ATT("Aggression",10),ATT("Bravery",10),ATT("Pace",7),ATT("Stamina",5)],
    metrics: [MET("Tackles Won",30),MET("Interceptions",25),MET("Clearances",20),MET("Presses Completed",15),MET("Distance Covered",10)],
  },

  // ========== Médios Defensivos ==========
  {
    id: uid(), emoji: "⚓", name: "Anchor", group: "Médios Defensivos",
    subtitle: "O especialista defensivo.",
    attributes: [ATT("Positioning",22),ATT("Anticipation",18),ATT("Tackling",15),ATT("Concentration",10),ATT("Decisions",10),ATT("Strength",8),ATT("Work Rate",7),ATT("Passing",5),ATT("Stamina",5)],
    metrics: [MET("Interceptions",35),MET("Tackles Won",25),MET("Presses Completed",15),MET("Passes Completed",15),MET("Blocks",10)],
  },
  {
    id: uid(), emoji: "🛡️", name: "Defensive Midfielder", group: "Médios Defensivos",
    subtitle: "Mais equilibrado.",
    attributes: [ATT("Positioning",18),ATT("Anticipation",16),ATT("Tackling",14),ATT("Decisions",12),ATT("Passing",10),ATT("Work Rate",10),ATT("Stamina",8),ATT("Concentration",7),ATT("Strength",5)],
    metrics: [MET("Interceptions",25),MET("Tackles Won",20),MET("Passes Completed",20),MET("Presses Completed",15),MET("Forward Passes",10),MET("Distance Covered",10)],
  },
  {
    id: uid(), emoji: "⚔️", name: "Ball Winning Midfielder", group: "Médios Defensivos",
    subtitle: "O recuperador.",
    attributes: [ATT("Tackling",20),ATT("Aggression",15),ATT("Anticipation",15),ATT("Work Rate",12),ATT("Positioning",10),ATT("Bravery",10),ATT("Stamina",8),ATT("Strength",5),ATT("Decisions",5)],
    metrics: [MET("Tackles Won",35),MET("Presses Completed",25),MET("Interceptions",20),MET("Distance Covered",10),MET("Fouls Committed",10)],
    note: "Fouls aqui não são necessariamente maus. Um BWM muito ativo normalmente faz mais faltas.",
  },
  {
    id: uid(), emoji: "🎯", name: "Half Back", group: "Médios Defensivos",
    subtitle: "Central extra na saída.",
    attributes: [ATT("Positioning",20),ATT("Anticipation",18),ATT("Passing",12),ATT("Decisions",12),ATT("Tackling",12),ATT("Concentration",10),ATT("Strength",8),ATT("Work Rate",5),ATT("Jumping Reach",3)],
    metrics: [MET("Interceptions",30),MET("Passes Completed",25),MET("Tackles Won",15),MET("Forward Passes",15),MET("Blocks",15)],
  },
  {
    id: uid(), emoji: "🎩", name: "Deep Lying Playmaker", group: "Médios Defensivos",
    subtitle: "O organizador recuado.",
    attributes: [ATT("Passing",22),ATT("Vision",18),ATT("Decisions",15),ATT("Anticipation",10),ATT("Positioning",10),ATT("Technique",10),ATT("Composure",8),ATT("First Touch",7)],
    metrics: [MET("Passes Completed",30),MET("Forward Passes",25),MET("Key Passes",20),MET("Interceptions",15),MET("Presses Completed",10)],
  },
  {
    id: uid(), emoji: "👑", name: "Regista", group: "Médios Defensivos",
    subtitle: "O cérebro absoluto. Mais criativo que o DLP.",
    attributes: [ATT("Vision",22),ATT("Passing",20),ATT("Decisions",15),ATT("Technique",12),ATT("Composure",10),ATT("First Touch",8),ATT("Anticipation",7),ATT("Flair",6)],
    metrics: [MET("Key Passes",30),MET("Forward Passes",25),MET("Passes Completed",20),MET("Presses Completed",10),MET("Interceptions",10),MET("Distance Covered",5)],
  },
  {
    id: uid(), emoji: "🌍", name: "Roaming Playmaker", group: "Médios Defensivos",
    subtitle: "Mistura criador + transportador.",
    attributes: [ATT("Passing",18),ATT("Vision",16),ATT("Decisions",14),ATT("Work Rate",12),ATT("Stamina",12),ATT("Technique",10),ATT("Anticipation",8),ATT("Dribbling",5),ATT("Pace",5)],
    metrics: [MET("Distance Covered",20),MET("Passes Completed",20),MET("Forward Passes",20),MET("Key Passes",15),MET("Presses Completed",15),MET("Dribbles",10)],
  },
  {
    id: uid(), emoji: "🚀", name: "Segundo Volante", group: "Médios Defensivos",
    subtitle: "Chega à área e participa ofensivamente.",
    attributes: [ATT("Work Rate",16),ATT("Stamina",15),ATT("Off The Ball",15),ATT("Decisions",12),ATT("Anticipation",10),ATT("Passing",10),ATT("Finishing",8),ATT("Technique",8),ATT("Pace",6)],
    metrics: [MET("Distance Covered",20),MET("Presses Completed",20),MET("Forward Passes",15),MET("Key Passes",15),MET("Shots on Target",15),MET("Interceptions",15)],
  },

  // ========== Alas ==========
  {
    id: uid(), emoji: "🪽", name: "Winger", group: "Alas",
    subtitle: "O extremo clássico.",
    attributes: [ATT("Crossing",18),ATT("Pace",16),ATT("Acceleration",14),ATT("Work Rate",12),ATT("Dribbling",12),ATT("Technique",10),ATT("Vision",8),ATT("Stamina",5),ATT("Decisions",5)],
    metrics: [MET("Crosses Completed",25),MET("Cross Attempts",20),MET("Dribbles",20),MET("Key Passes",15),MET("Sprints",10),MET("Distance Covered",10)],
  },
  {
    id: uid(), emoji: "⚡", name: "Winger (Attack)", group: "Alas",
    subtitle: "Mais vertical.",
    attributes: [ATT("Pace",18),ATT("Acceleration",18),ATT("Dribbling",15),ATT("Crossing",15),ATT("Work Rate",10),ATT("Technique",8),ATT("Off The Ball",8),ATT("Decisions",5),ATT("Vision",3)],
    metrics: [MET("Dribbles",25),MET("Crosses Completed",20),MET("Sprints",20),MET("Cross Attempts",15),MET("Key Passes",10),MET("Shots on Target",10)],
  },
  {
    id: uid(), emoji: "🔄", name: "Inverted Winger", group: "Alas",
    subtitle: "Criador que parte da ala.",
    attributes: [ATT("Vision",18),ATT("Passing",15),ATT("Dribbling",15),ATT("Decisions",14),ATT("Technique",12),ATT("Pace",10),ATT("Acceleration",8),ATT("Flair",5),ATT("Work Rate",3)],
    metrics: [MET("Key Passes",30),MET("Dribbles",20),MET("Forward Passes",20),MET("Passes Completed",15),MET("Crosses Completed",10),MET("Sprints",5)],
  },
  {
    id: uid(), emoji: "🔥", name: "Inside Forward", group: "Alas",
    subtitle: "Finalizador vindo da ala.",
    attributes: [ATT("Dribbling",18),ATT("Acceleration",15),ATT("Pace",15),ATT("Off The Ball",15),ATT("Finishing",12),ATT("Decisions",10),ATT("Technique",8),ATT("Flair",7)],
    metrics: [MET("Dribbles",25),MET("Shots on Target",25),MET("Key Passes",15),MET("Sprints",15),MET("Offsides",10),MET("Distance Covered",10)],
  },
  {
    id: uid(), emoji: "🛡️", name: "Defensive Winger", group: "Alas",
    subtitle: "O papel mais dependente do leak.",
    attributes: [ATT("Work Rate",20),ATT("Anticipation",15),ATT("Positioning",12),ATT("Stamina",12),ATT("Tackling",10),ATT("Pace",10),ATT("Crossing",8),ATT("Decisions",8),ATT("Teamwork",5)],
    metrics: [MET("Presses Completed",25),MET("Distance Covered",25),MET("Interceptions",15),MET("Tackles Won",15),MET("Crosses Completed",10),MET("Sprints",10)],
  },
  {
    id: uid(), emoji: "↔️", name: "Wide Midfielder", group: "Alas",
    subtitle: "O ala equilibrado.",
    attributes: [ATT("Work Rate",15),ATT("Crossing",15),ATT("Passing",12),ATT("Decisions",12),ATT("Stamina",10),ATT("Pace",10),ATT("Positioning",8),ATT("Dribbling",8),ATT("Technique",5),ATT("Vision",5)],
    metrics: [MET("Crosses Completed",20),MET("Distance Covered",20),MET("Passes Completed",15),MET("Presses Completed",15),MET("Key Passes",15),MET("Dribbles",15)],
  },
  {
    id: uid(), emoji: "🎨", name: "Wide Playmaker", group: "Alas",
    subtitle: "Criador desde a ala.",
    attributes: [ATT("Vision",22),ATT("Passing",18),ATT("Decisions",15),ATT("Technique",12),ATT("First Touch",10),ATT("Dribbling",8),ATT("Flair",7),ATT("Work Rate",5),ATT("Pace",3)],
    metrics: [MET("Key Passes",35),MET("Forward Passes",25),MET("Passes Completed",20),MET("Crosses Completed",10),MET("Dribbles",10)],
  },
  {
    id: uid(), emoji: "👻", name: "Raumdeuter", group: "Alas",
    subtitle: "O mais difícil de modelar.",
    attributes: [ATT("Off The Ball",25),ATT("Anticipation",18),ATT("Acceleration",15),ATT("Pace",12),ATT("Finishing",10),ATT("Decisions",8),ATT("Composure",7),ATT("Work Rate",5)],
    metrics: [MET("Offsides",25),MET("Shots on Target",25),MET("Sprints",20),MET("Distance Covered",10),MET("Key Passes",10),MET("Dribbles",10)],
  },

  // ========== Médio Ofensivo ==========
  {
    id: uid(), emoji: "🎨", name: "Advanced Playmaker (AM)", group: "Médio Ofensivo",
    subtitle: "O cérebro ofensivo.",
    attributes: [ATT("Vision",22),ATT("Passing",20),ATT("Decisions",15),ATT("Technique",12),ATT("First Touch",10),ATT("Flair",8),ATT("Composure",8),ATT("Off The Ball",5)],
    metrics: [MET("Key Passes",35),MET("Forward Passes",25),MET("Passes Completed",20),MET("Dribbles",10),MET("Distance Covered",10)],
  },
  {
    id: uid(), emoji: "🎯", name: "Attacking Midfielder", group: "Médio Ofensivo",
    subtitle: "Cria e finaliza.",
    attributes: [ATT("Decisions",16),ATT("Vision",15),ATT("Passing",14),ATT("Off The Ball",14),ATT("Technique",10),ATT("Finishing",10),ATT("First Touch",8),ATT("Composure",8),ATT("Anticipation",5)],
    metrics: [MET("Key Passes",25),MET("Shots on Target",20),MET("Forward Passes",20),MET("Dribbles",15),MET("Passes Completed",10),MET("Offsides",10)],
  },
  {
    id: uid(), emoji: "⚔️", name: "Shadow Striker", group: "Médio Ofensivo",
    subtitle: "Quase um avançado.",
    attributes: [ATT("Off The Ball",20),ATT("Finishing",18),ATT("Anticipation",15),ATT("Acceleration",12),ATT("Pace",10),ATT("Composure",10),ATT("Decisions",8),ATT("Technique",7)],
    metrics: [MET("Shots on Target",35),MET("Offsides",20),MET("Sprints",15),MET("Dribbles",15),MET("Key Passes",10),MET("Distance Covered",5)],
  },
  {
    id: uid(), emoji: "👑", name: "Trequartista (AM)", group: "Médio Ofensivo",
    subtitle: "Criador livre.",
    attributes: [ATT("Vision",20),ATT("Flair",18),ATT("Technique",15),ATT("Passing",15),ATT("First Touch",12),ATT("Decisions",10),ATT("Composure",5),ATT("Off The Ball",5)],
    metrics: [MET("Key Passes",35),MET("Dribbles",20),MET("Forward Passes",20),MET("Passes Completed",10),MET("Shots on Target",10),MET("Distance Covered",5)],
  },
  {
    id: uid(), emoji: "🎭", name: "Enganche", group: "Médio Ofensivo",
    subtitle: "O organizador estático.",
    attributes: [ATT("Vision",22),ATT("Passing",20),ATT("Decisions",15),ATT("Technique",15),ATT("First Touch",12),ATT("Composure",8),ATT("Flair",8)],
    metrics: [MET("Key Passes",40),MET("Forward Passes",25),MET("Passes Completed",20),MET("Dribbles",10),MET("Shots on Target",5)],
  },

  // ========== Avançados ==========
  {
    id: uid(), emoji: "⚡", name: "Advanced Forward", group: "Avançados",
    subtitle: "O avançado moderno.",
    attributes: [ATT("Off The Ball",18),ATT("Finishing",18),ATT("Acceleration",15),ATT("Pace",15),ATT("Composure",12),ATT("Anticipation",10),ATT("Decisions",7),ATT("Dribbling",5)],
    metrics: [MET("Shots on Target",35),MET("Offsides",20),MET("Sprints",20),MET("Dribbles",10),MET("Key Passes",5),MET("Distance Covered",10)],
  },
  {
    id: uid(), emoji: "🦊", name: "Poacher", group: "Avançados",
    subtitle: "Predador puro.",
    attributes: [ATT("Finishing",22),ATT("Off The Ball",20),ATT("Anticipation",15),ATT("Composure",15),ATT("Acceleration",10),ATT("Pace",10),ATT("Decisions",8)],
    metrics: [MET("Shots on Target",45),MET("Offsides",25),MET("Sprints",15),MET("Distance Covered",5),MET("Dribbles",5),MET("Key Passes",5)],
  },
  {
    id: uid(), emoji: "🎯", name: "Target Forward", group: "Avançados",
    subtitle: "Referência física.",
    attributes: [ATT("Strength",20),ATT("Jumping Reach",20),ATT("Heading",18),ATT("Off The Ball",10),ATT("Bravery",10),ATT("Finishing",10),ATT("Anticipation",7),ATT("Decisions",5)],
    metrics: [MET("Headers Won",40),MET("Key Headers",25),MET("Shots on Target",15),MET("Offsides",10),MET("Key Passes",10)],
  },
  {
    id: uid(), emoji: "🔄", name: "Deep Lying Forward", group: "Avançados",
    subtitle: "Liga o jogo.",
    attributes: [ATT("Passing",18),ATT("Vision",15),ATT("First Touch",15),ATT("Decisions",14),ATT("Technique",12),ATT("Off The Ball",10),ATT("Finishing",8),ATT("Composure",8)],
    metrics: [MET("Key Passes",30),MET("Forward Passes",25),MET("Passes Completed",15),MET("Shots on Target",15),MET("Dribbles",10),MET("Offsides",5)],
  },
  {
    id: uid(), emoji: "🔥", name: "Pressing Forward", group: "Avançados",
    subtitle: "O papel mais influenciado pelo leak.",
    attributes: [ATT("Work Rate",20),ATT("Anticipation",15),ATT("Acceleration",15),ATT("Stamina",12),ATT("Aggression",10),ATT("Pace",10),ATT("Finishing",8),ATT("Decisions",5),ATT("Off The Ball",5)],
    metrics: [MET("Presses Completed",35),MET("Distance Covered",20),MET("Sprints",20),MET("Shots on Target",10),MET("Offsides",10),MET("Key Passes",5)],
  },
  {
    id: uid(), emoji: "👑", name: "Complete Forward", group: "Avançados",
    subtitle: "Faz tudo.",
    attributes: [ATT("Finishing",15),ATT("Off The Ball",15),ATT("Decisions",12),ATT("Technique",12),ATT("Composure",10),ATT("First Touch",10),ATT("Passing",10),ATT("Vision",8),ATT("Pace",8)],
    metrics: [MET("Shots on Target",25),MET("Key Passes",20),MET("Dribbles",15),MET("Offsides",15),MET("Sprints",15),MET("Forward Passes",10)],
  },
  {
    id: uid(), emoji: "🎭", name: "False Nine", group: "Avançados",
    subtitle: "O criador disfarçado de ponta-de-lança.",
    attributes: [ATT("Vision",18),ATT("Passing",18),ATT("First Touch",15),ATT("Decisions",15),ATT("Technique",12),ATT("Off The Ball",10),ATT("Composure",7),ATT("Flair",5)],
    metrics: [MET("Key Passes",35),MET("Forward Passes",25),MET("Passes Completed",15),MET("Dribbles",15),MET("Shots on Target",5),MET("Offsides",5)],
  },
  {
    id: uid(), emoji: "🎨", name: "Trequartista (ST)", group: "Avançados",
    subtitle: "A versão avançada do F9.",
    attributes: [ATT("Flair",18),ATT("Vision",18),ATT("Technique",15),ATT("Passing",15),ATT("First Touch",12),ATT("Decisions",10),ATT("Off The Ball",7),ATT("Composure",5)],
    metrics: [MET("Key Passes",30),MET("Dribbles",25),MET("Forward Passes",20),MET("Shots on Target",10),MET("Passes Completed",10),MET("Offsides",5)],
  },
];

export function loadLeakRoles(): LeakRole[] {
  if (typeof window === "undefined") return LEAK_DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return LEAK_DEFAULTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return LEAK_DEFAULTS;
    return parsed;
  } catch {
    return LEAK_DEFAULTS;
  }
}

export function saveLeakRoles(roles: LeakRole[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(roles));
}

export function resetLeakRoles() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function newId() { return uid(); }
