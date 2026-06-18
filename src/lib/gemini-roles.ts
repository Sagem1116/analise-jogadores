// FM24 role metrics catalog (Gemini analysis).
export type GeminiMetric = { name: string; weight: number; note?: string };
export type GeminiRole = { name: string; description: string; metrics: GeminiMetric[] };
export type GeminiCategory = { title: string; roles: GeminiRole[] };

export const GEMINI_CATALOG: GeminiCategory[] = [
  {
    title: "1. Guarda-Redes",
    roles: [
      {
        name: "Guarda-Redes (Goalkeeper)",
        description: "O guardião tradicional. Foco no posicionamento estrito entre os postes e na minimização de riscos. Raramente sai da área e prefere passes curtos e seguros.",
        metrics: [
          { name: "Save %", weight: 10, note: "Eficácia pura em parar remates." },
          { name: "xSave % Overperformance", weight: 9, note: "Defender o indefensável." },
          { name: "Saves Held/90", weight: 8, note: "Segurança de mãos; evitar segundas oportunidades." },
          { name: "Mistakes Leading to Goal", weight: 8, note: "Consistência vital (peso invertido)." },
          { name: "Saves/Goal Conceded", weight: 7, note: "Rácio direto de impacto no jogo." },
        ],
      },
      {
        name: "Guarda-Redes Líbero (Sweeper Keeper)",
        description: "O 11º jogador de campo. Em posse sobe para oferecer linhas de passe; defensivamente varre bolas metidas nas costas da defesa.",
        metrics: [
          { name: "Progressive Passes", weight: 10, note: "Quebrar a primeira linha de pressão." },
          { name: "Pass Completion %", weight: 9, note: "Erros = baliza aberta." },
          { name: "xSave % Overperformance", weight: 8, note: "Agilidade para recuperar posição." },
          { name: "Interceptions/90", weight: 8, note: "Eficácia a cortar passes longos." },
          { name: "Distance Covered", weight: 7, note: "Mobilidade fora da pequena área." },
        ],
      },
    ],
  },
  {
    title: "2. Defesas Centrais",
    roles: [
      {
        name: "Defesa Central (Central Defender)",
        description: "Fundação da defesa. Marcar, desarmar e cobrir. Sem permissão para inventar com a bola.",
        metrics: [
          { name: "Tackle Completion %", weight: 10, note: "Eficácia no 1v1." },
          { name: "Headers Won %", weight: 9, note: "Neutralizar jogo direto e bolas paradas." },
          { name: "Interceptions/90", weight: 9, note: "Sentido posicional e leitura de jogo." },
          { name: "Clearances/90", weight: 7, note: "Aliviar pressão em momentos críticos." },
          { name: "Possession Lost", weight: 8, note: "Peso invertido — quanto menos, melhor." },
        ],
      },
      {
        name: "Defesa com Bola (Ball Playing Defender)",
        description: "Estratega recuado. Defende e lança contra-ataques com passes longos ou verticais que saltam o meio-campo.",
        metrics: [
          { name: "Progressive Passes/90", weight: 10, note: "Define se está a 'jogar' ou só a 'defender'." },
          { name: "Pass Completion %", weight: 9, note: "Precisão em passes de risco." },
          { name: "Key Passes", weight: 8, note: "Colocar o avançado na cara do golo." },
          { name: "Tackle Completion %", weight: 8, note: "Continua a ser um central." },
          { name: "Interceptions/90", weight: 7, note: "Iniciar a transição rapidamente." },
        ],
      },
      {
        name: "Defesa Central Eficiente (No-Nonsense CB)",
        description: "O destruidor. Tira a bola de zonas de perigo o mais rápido possível, sem preocupação estética.",
        metrics: [
          { name: "Clearances/90", weight: 10, note: "O volume de bolas aliviadas é o seu sucesso." },
          { name: "Headers Won %", weight: 10, note: "Domínio absoluto do jogo aéreo." },
          { name: "Tackles Completed/90", weight: 9, note: "Volume de intervenções físicas." },
          { name: "Mistakes Leading to Goal", weight: 9, note: "Peso invertido — não falhar o básico." },
          { name: "Possession Lost", weight: 6, note: "Aceitável se for longe da baliza." },
        ],
      },
      {
        name: "Central Descaído (Wide Centre-Back)",
        description: "Exclusivo de defesas a 3. Em posse abre como lateral para libertar o ala. Pode cruzar ou conduzir.",
        metrics: [
          { name: "Progressive Passes/90", weight: 10, note: "Saída de bola pelos flancos." },
          { name: "Crosses Attempted/90", weight: 8, note: "Participação no último terço." },
          { name: "Tackle Completion %", weight: 8, note: "Cobertura lateral." },
          { name: "Dribbles/90", weight: 7, note: "Transportar a bola sob pressão." },
          { name: "Interceptions/90", weight: 7, note: "Leitura de bolas nos corredores." },
        ],
      },
      {
        name: "Líbero Avançado (Libero)",
        description: "Híbrido raro. Recua como central; em posse avança ao meio-campo como organizador (DLP).",
        metrics: [
          { name: "Passes Attempted/90", weight: 10, note: "Centro do jogo de posse." },
          { name: "Progressive Passes", weight: 10, note: "Ditar o ritmo de jogo." },
          { name: "Interceptions/90", weight: 9, note: "Recuperar bola e manter sufoco." },
          { name: "Distance Covered", weight: 8, note: "Pulmão de elite." },
          { name: "Chances Created", weight: 7, note: "Participação ativa na criação." },
        ],
      },
    ],
  },
  {
    title: "3. Defesas Laterais e Alas",
    roles: [
      {
        name: "Defesa Lateral (Full-Back)",
        description: "Equilíbrio. Sobe com critério, defende com rigor. Suporte lateral clássico.",
        metrics: [
          { name: "Tackle Completion %", weight: 10, note: "Parar o extremo adversário." },
          { name: "Crosses Completed %", weight: 9, note: "Qualidade sobre quantidade." },
          { name: "Interceptions/90", weight: 8, note: "Fechar linhas de passe interiores." },
          { name: "Progressive Passes", weight: 7, note: "Ligar defesa a ataque pelo corredor." },
          { name: "Distance Covered", weight: 7, note: "Vaivém lateral consistente." },
        ],
      },
      {
        name: "Ala (Wing-Back)",
        description: "Jogador de corredor total. Principal fonte de largura. Exige enorme resistência física.",
        metrics: [
          { name: "Sprints/90", weight: 10, note: "Cobrir toda a ala repetidamente." },
          { name: "Crosses Attempted/90", weight: 9, note: "Volume ofensivo." },
          { name: "Tackles Attempted/90", weight: 8, note: "Pressão defensiva no flanco." },
          { name: "Progressive Passes/90", weight: 8, note: "Empurrar a equipa para a frente." },
          { name: "Open Play Cross Completion %", weight: 7, note: "Eficácia em jogo corrido." },
        ],
      },
      {
        name: "Lateral Descomplicado (No-Nonsense FB)",
        description: "Central adaptado à lateral. Não cruza, não dribla. Fica atrás e fecha a porta.",
        metrics: [
          { name: "Tackles Completed/90", weight: 10, note: "Ocupação defensiva total." },
          { name: "Clearances/90", weight: 9, note: "Segurança primeiro." },
          { name: "Headers Won %", weight: 8, note: "Defender cruzamentos ao 2º poste." },
          { name: "Mistakes Leading to Goal", weight: 8, note: "Peso invertido." },
          { name: "Interceptions/90", weight: 7, note: "Corte de bolas longas." },
        ],
      },
      {
        name: "Ala Completo (Complete Wing-Back)",
        description: "Vagabundo do flanco. Liberdade total para finalizar, driblar e criar — quase um extremo.",
        metrics: [
          { name: "Chances Created/90", weight: 10, note: "Impacto criativo direto." },
          { name: "Dribbles/90", weight: 10, note: "Romper linhas pelo drible." },
          { name: "Key Passes/90", weight: 9, note: "Visão de jogo lateral." },
          { name: "Sprints/90", weight: 9, note: "Intensidade ofensiva e defensiva." },
          { name: "xA/90", weight: 8, note: "Qualidade da assistência esperada." },
        ],
      },
      {
        name: "Defesa Ala Invertido (Inverted Wing-Back)",
        description: "Em posse desloca-se ao centro do meio-campo para criar superioridade numérica no miolo.",
        metrics: [
          { name: "Pass Completion %", weight: 10, note: "Retenção no centro." },
          { name: "Progressive Passes/90", weight: 10, note: "Distribuição a partir do centro." },
          { name: "Interceptions/90", weight: 9, note: "Proteção contra contra-ataque central." },
          { name: "Distance Covered", weight: 8, note: "Movimentação diagonal constante." },
          { name: "Possession Won/90", weight: 7, note: "Recuperação após perda ofensiva." },
        ],
      },
    ],
  },
  {
    title: "4. Médios Defensivos",
    roles: [
      {
        name: "Médio Defensivo (Defensive Midfielder)",
        description: "Protetor da zona entre linhas. Mantém posição e distribui de forma simples.",
        metrics: [
          { name: "Pass Completion %", weight: 10, note: "Manutenção da posse e segurança." },
          { name: "Tackles Completed/90", weight: 9, note: "Eficácia no miolo." },
          { name: "Interceptions/90", weight: 9, note: "Bloquear o caminho até aos avançados." },
          { name: "Pressure Success %", weight: 8, note: "Forçar o erro sem sair de posição." },
          { name: "Progressive Passes", weight: 7, note: "Ligar aos médios criativos." },
        ],
      },
      {
        name: "Construtor de Jogo Recuado (Deep Lying Playmaker)",
        description: "O 'quarterback'. Posiciona-se à frente da defesa e organiza com passes curtos e longos.",
        metrics: [
          { name: "Passes Attempted/90", weight: 10, note: "Deve ser quem mais toca na bola." },
          { name: "Progressive Passes", weight: 10, note: "Quebrar linhas." },
          { name: "xA/90", weight: 9, note: "Qualidade da criação remota." },
          { name: "Key Passes", weight: 8, note: "Desequilibrar a estrutura adversária." },
          { name: "Pass Completion %", weight: 8, note: "Precisão obrigatória." },
        ],
      },
      {
        name: "Médio Recuperador de Bolas (Ball Winning Midfielder)",
        description: "O destruidor agressivo. Abandona a posição para perseguir o portador da bola.",
        metrics: [
          { name: "Pressures Attempted/90", weight: 10, note: "Atividade defensiva incessante." },
          { name: "Tackles Attempted/90", weight: 10, note: "Agressividade no desarme." },
          { name: "Possession Won/90", weight: 9, note: "O resultado do seu trabalho." },
          { name: "Distance Covered", weight: 8, note: "Mobilidade de pressão." },
          { name: "Fouls Committed/90", weight: 7, note: "Peso negativo — disciplina." },
        ],
      },
      {
        name: "Trinco (Anchor)",
        description: "Estático e disciplinado. Não sai da frente dos centrais. Seguro de vida contra contra-ataques.",
        metrics: [
          { name: "Interceptions/90", weight: 10, note: "Posicionamento perfeito." },
          { name: "Tackle Completion %", weight: 10, note: "Não pode ser ultrapassado no drible." },
          { name: "Pass Completion %", weight: 9, note: "Simplicidade total." },
          { name: "Mistakes Leading to Goal", weight: 9, note: "Peso invertido — fiabilidade máxima." },
          { name: "Possession Lost", weight: 8, note: "Peso invertido." },
        ],
      },
      {
        name: "Pivô Defensivo (Half Back)",
        description: "Recua como terceiro central em posse, permitindo que ambos os laterais subam em segurança.",
        metrics: [
          { name: "Passes Attempted/90", weight: 10, note: "Distribuição a partir de trás." },
          { name: "Pass Completion %", weight: 9, note: "Precisão na 1ª fase de construção." },
          { name: "Interceptions/90", weight: 8, note: "Proteção da zona central recuada." },
          { name: "Headers Won %", weight: 7, note: "Atua como central." },
          { name: "Distance Covered", weight: 7, note: "Movimentação constante." },
        ],
      },
      {
        name: "Médio Criativo (Regista)",
        description: "Um DLP sem amarras. Liberdade para deambular e procurar a bola onde for preciso.",
        metrics: [
          { name: "Chances Created/90", weight: 10, note: "Criação a partir de trás." },
          { name: "Key Passes/90", weight: 10, note: "Visão de jogo periférica." },
          { name: "Progressive Passes", weight: 9, note: "Verticalização constante." },
          { name: "xA/90", weight: 9, note: "Expectativa de elite." },
          { name: "Passes Attempted/90", weight: 8, note: "Centralização das ações." },
        ],
      },
      {
        name: "Organizador Móvel (Roaming Playmaker)",
        description: "Motor da equipa. Transporta a bola da defesa para o ataque, aparecendo em todo o lado.",
        metrics: [
          { name: "Distance Covered/90", weight: 10, note: "Ubiquidade no campo." },
          { name: "Progressive Passes", weight: 9, note: "Ligação entre setores." },
          { name: "Dribbles/90", weight: 9, note: "Transporte sob pressão." },
          { name: "Pass Completion %", weight: 8, note: "Fluidez de jogo." },
          { name: "Key Passes", weight: 8, note: "Participação no último passe." },
        ],
      },
      {
        name: "Segundo Volante",
        description: "Box-to-box a partir de médio defensivo. Arma surpresa que chega à área para rematar.",
        metrics: [
          { name: "Shots/90", weight: 10, note: "Presença finalizadora vindo de trás." },
          { name: "xG", weight: 9, note: "Qualidade das chances encontradas." },
          { name: "Distance Covered/90", weight: 9, note: "Exigência físcia box-to-box." },
          { name: "Tackles Completed/90", weight: 8, note: "Defender em transição." },
          { name: "Sprints/90", weight: 8, note: "Chegada rápida à área." },
        ],
      },
    ],
  },
  {
    title: "5. Médios Centro",
    roles: [
      {
        name: "Médio Centro (Central Midfielder)",
        description: "Generalista. Conforme a tarefa, pode ser cérebro, destruidor ou finalizador.",
        metrics: [
          { name: "Pass Completion %", weight: 9, note: "Elo de ligação fundamental." },
          { name: "Progressive Passes", weight: 8, note: "Transição de jogo." },
          { name: "Tackles Completed/90", weight: 7, note: "Estabilidade defensiva." },
          { name: "Key Passes", weight: 7, note: "Apoio ofensivo." },
          { name: "Distance Covered", weight: 7, note: "Presença constante." },
        ],
      },
      {
        name: "Médio Área-a-Área (Box To Box)",
        description: "Pulmão. Defende a sua área e aparece na área adversária para finalizar.",
        metrics: [
          { name: "Distance Covered/90", weight: 10, note: "Volume de trabalho total." },
          { name: "Tackles Completed/90", weight: 9, note: "Recuperação de bola." },
          { name: "Shots/90", weight: 8, note: "Ameaça de golo." },
          { name: "Pass Completion %", weight: 8, note: "Continuidade de jogo." },
          { name: "Sprints/90", weight: 8, note: "Intensidade de transição." },
        ],
      },
      {
        name: "Construtor de Jogo Avançado (Advanced Playmaker)",
        description: "Opera nos espaços entre meio-campo e ataque. Dita o jogo no último terço.",
        metrics: [
          { name: "Key Passes/90", weight: 10, note: "Sua principal função." },
          { name: "xA/90", weight: 10, note: "Técnica no passe final." },
          { name: "Pass Completion %", weight: 9, note: "Reter posse sob pressão alta." },
          { name: "Chances Created/90", weight: 9, note: "Volume de oportunidades." },
          { name: "Progressive Passes", weight: 8, note: "Levar a bola a zonas de perigo." },
        ],
      },
      {
        name: "Mezzala",
        description: "Médio que joga em meio-espaços. Desloca-se para as alas em posse, criando triângulos.",
        metrics: [
          { name: "Dribbles/90", weight: 10, note: "Romper em meio-espaços." },
          { name: "Key Passes/90", weight: 9, note: "Criatividade lateralizada." },
          { name: "Shots/90", weight: 9, note: "Finalização do corredor interno." },
          { name: "xA/90", weight: 8, note: "Assistências esperadas." },
          { name: "Progressive Passes", weight: 8, note: "Progressão ofensiva." },
        ],
      },
      {
        name: "Carrilero",
        description: "O 'shuttler'. Move-se lateralmente para cobrir subidas dos alas e tapar buracos.",
        metrics: [
          { name: "Interceptions/90", weight: 10, note: "Ocupação inteligente do espaço." },
          { name: "Pass Completion %", weight: 10, note: "Segurança absoluta." },
          { name: "Tackles Completed/90", weight: 9, note: "Proteção dos flancos internos." },
          { name: "Distance Covered", weight: 8, note: "Trabalho de formiga." },
          { name: "Possession Lost", weight: 8, note: "Peso invertido." },
        ],
      },
    ],
  },
  {
    title: "6. Médios Ofensivos",
    roles: [
      {
        name: "Médio Ofensivo (Attacking Midfielder)",
        description: "O tradicional Camisa 10. Joga no buraco entre defesa e ataque para criar e finalizar.",
        metrics: [
          { name: "Key Passes/90", weight: 10, note: "Métrica de ouro." },
          { name: "xA/90", weight: 10, note: "Visão de jogo." },
          { name: "Shots/90", weight: 9, note: "Ameaça constante." },
          { name: "Goals/90", weight: 8, note: "Contribuição direta no placar." },
          { name: "Pass Completion %", weight: 8, note: "Precisão no último terço." },
        ],
      },
      {
        name: "Número 10 (Trequartista)",
        description: "Liberdade total. Não defende. Deambula em busca de espaços para destruir o adversário.",
        metrics: [
          { name: "Chances Created/90", weight: 10, note: "Criatividade pura." },
          { name: "Dribbles/90", weight: 9, note: "Desequilíbrio individual." },
          { name: "xA/90", weight: 9, note: "Qualidade de assistência." },
          { name: "Goal Contributions/90", weight: 9, note: "Sua medida final." },
          { name: "Open Play Key Passes", weight: 8, note: "Sem depender de bolas paradas." },
        ],
      },
      {
        name: "Pivô Ofensivo (Enganche)",
        description: "O 10 estático. Ponto de referência técnica que distribui jogo sem se mover muito.",
        metrics: [
          { name: "Pass Completion %", weight: 10, note: "Não pode falhar em zonas densas." },
          { name: "Key Passes/90", weight: 10, note: "Distribuição letal." },
          { name: "xA/90", weight: 9, note: "Precisão no passe de rutura." },
          { name: "Progressive Passes", weight: 9, note: "Ligar ao ataque." },
          { name: "Chances Created", weight: 8, note: "Volume criativo." },
        ],
      },
      {
        name: "Avançado Sombra (Shadow Striker)",
        description: "Ataca o espaço criado pelo ponta de lança. Finalizador que parte de trás para surpreender.",
        metrics: [
          { name: "Goals/90", weight: 10, note: "É medido pelos golos." },
          { name: "xG/90", weight: 10, note: "Frequência de boas chances." },
          { name: "Shots on Target %", weight: 9, note: "Letalidade no remate." },
          { name: "Non-pen Goals/90", weight: 9, note: "Eficácia em jogo corrido." },
          { name: "Sprints/90", weight: 8, note: "Rutura nas costas da defesa." },
        ],
      },
    ],
  },
  {
    title: "7. Extremos e Médios Ala",
    roles: [
      {
        name: "Médio Ala (Wide Midfielder)",
        description: "Papel tático. Ajuda a defender e apoia o ataque com passes e cruzamentos.",
        metrics: [
          { name: "Crosses Completed %", weight: 10, note: "Qualidade no serviço." },
          { name: "Tackles Completed/90", weight: 9, note: "Apoio defensivo ao lateral." },
          { name: "Pass Completion %", weight: 9, note: "Manutenção da posse." },
          { name: "Interceptions/90", weight: 8, note: "Corte de linhas laterais." },
          { name: "Key Passes", weight: 7, note: "Criatividade controlada." },
        ],
      },
      {
        name: "Extremo (Winger)",
        description: "Bate o defesa na velocidade e linha de fundo para cruzar. Largura máxima.",
        metrics: [
          { name: "Dribbles/90", weight: 10, note: "Capacidade de 1v1." },
          { name: "Crosses Attempted/90", weight: 10, note: "Volume de cruzamentos." },
          { name: "Sprints/90", weight: 9, note: "Explosão no corredor." },
          { name: "Open Play Cross Completion %", weight: 9, note: "Eficácia técnica." },
          { name: "Key Passes", weight: 8, note: "Passes que geram remates." },
        ],
      },
      {
        name: "Extremo Defensivo (Defensive Winger)",
        description: "Pressiona o lateral adversário, recupera bolas e ataca de forma simples.",
        metrics: [
          { name: "Pressures Completed/90", weight: 10, note: "Sucesso na pressão alta." },
          { name: "Tackles Attempted/90", weight: 10, note: "Agressividade defensiva lateral." },
          { name: "Interceptions/90", weight: 9, note: "Recuperação de posse." },
          { name: "Distance Covered", weight: 9, note: "Sacrifício físico." },
          { name: "Crosses Attempted", weight: 8, note: "Volume de apoio ofensivo." },
        ],
      },
      {
        name: "Organizador Aberto (Wide Playmaker)",
        description: "Parte da ala mas flete para dentro para organizar — como um médio criativo descaído.",
        metrics: [
          { name: "Key Passes/90", weight: 10, note: "Visão de jogo a partir da ala." },
          { name: "Pass Completion %", weight: 10, note: "Segurança na circulação." },
          { name: "xA/90", weight: 9, note: "Qualidade da assistência esperada." },
          { name: "Progressive Passes", weight: 9, note: "Verticalização interior." },
          { name: "Chances Created", weight: 9, note: "Volume de oportunidades." },
        ],
      },
      {
        name: "Extremo Invertido (Inverted Winger)",
        description: "Corta para dentro para abrir espaço ou rematar/passar com o pé oposto ao flanco.",
        metrics: [
          { name: "Key Passes/90", weight: 10, note: "Diagonais para o avançado." },
          { name: "Shots/90", weight: 9, note: "Ameaça interior." },
          { name: "Dribbles/90", weight: 9, note: "Romper a defesa por dentro." },
          { name: "xA/90", weight: 8, note: "Qualidade do último passe." },
          { name: "Progressive Passes", weight: 8, note: "Conduzir a equipa à área." },
        ],
      },
      {
        name: "Avançado Interior (Inside Forward)",
        description: "Versão mais agressiva do extremo invertido. Quer marcar golos acima de tudo.",
        metrics: [
          { name: "Goals/90", weight: 10, note: "Finalização é o objetivo único." },
          { name: "xG/90", weight: 10, note: "Estar em posições de golo." },
          { name: "Shots Inside Box/90", weight: 9, note: "Presença na área vindo de fora." },
          { name: "Dribbles/90", weight: 9, note: "Bater o defesa para rematar." },
          { name: "Shots on Target %", weight: 8, note: "Precisão." },
        ],
      },
    ],
  },
  {
    title: "8. Avançados",
    roles: [
      {
        name: "Avançado de Referência (Target Forward)",
        description: "Ponto focal. Usa a força física para ganhar bolas aéreas e segurar o jogo para os colegas.",
        metrics: [
          { name: "Headers Won %", weight: 10, note: "Domínio aéreo absoluto." },
          { name: "Key Headers", weight: 10, note: "Cabeceamentos que geram oportunidades." },
          { name: "Assists/90", weight: 9, note: "Servir os colegas após ganhar a bola." },
          { name: "Possession Won/90", weight: 8, note: "Recuperação de bolas longas." },
          { name: "Goals", weight: 8, note: "Ainda precisa ser perigoso na área." },
        ],
      },
      {
        name: "Ponta de Lança Aberto (Raumdeuter)",
        description: "Intérprete de espaços. Não constrói; aparece de forma invisível em zonas de finalização.",
        metrics: [
          { name: "Non-pen Goals/90", weight: 10, note: "Eficácia máxima." },
          { name: "xG Overperformance", weight: 10, note: "Marcar com poucas chances." },
          { name: "Shots on Target %", weight: 9, note: "Precisão letal." },
          { name: "Goals Inside Box", weight: 9, note: "Caça os seus golos na área." },
          { name: "Offsides/90", weight: 8, note: "Peso invertido — inteligência para bater a linha." },
        ],
      },
      {
        name: "Avançado Recuado (Deep Lying Forward)",
        description: "Une meio-campo e ataque. Recua para receber e lançar os extremos ou o parceiro.",
        metrics: [
          { name: "Pass Completion %", weight: 10, note: "Jogo de apoio impecável." },
          { name: "Key Passes/90", weight: 9, note: "Criar chances para os colegas." },
          { name: "Assists/90", weight: 9, note: "Transformar apoio em golos." },
          { name: "Shots/90", weight: 8, note: "Manter a defesa ocupada." },
          { name: "Headers Won %", weight: 7, note: "Útil de costas para a baliza." },
        ],
      },
      {
        name: "Falso Nove (False Nine)",
        description: "Semelhante ao recuado, mas deambula mais, arrastando os centrais para fora de posição.",
        metrics: [
          { name: "Key Passes/90", weight: 10, note: "Criação de jogo pura." },
          { name: "Dribbles/90", weight: 9, note: "Girar sobre o defesa e conduzir." },
          { name: "xA/90", weight: 9, note: "Técnica na assistência." },
          { name: "Pass Completion %", weight: 9, note: "Manter o jogo de posse." },
          { name: "Progressive Passes", weight: 8, note: "Verticalizar a partir do meio-campo." },
        ],
      },
      {
        name: "Ponta-de-Lança (Advanced Forward)",
        description: "Goleador moderno. Finaliza, corre nos canais laterais e pressiona a defesa.",
        metrics: [
          { name: "Goals/90", weight: 10, note: "Métrica definitiva." },
          { name: "xG/90", weight: 10, note: "Frequência de finalização." },
          { name: "Shots on Target %", weight: 9, note: "Precisão de remate." },
          { name: "Dribbles/90", weight: 8, note: "Criar o seu próprio remate." },
          { name: "Sprints/90", weight: 8, note: "Velocidade em rutura." },
        ],
      },
      {
        name: "Ponta-de-Lança Fixo (Poacher)",
        description: "Não constrói. Fica no limite do fora de jogo para encostar bolas na pequena área.",
        metrics: [
          { name: "Conversion %", weight: 10, note: "Aproveitar as poucas bolas que toca." },
          { name: "Goals Inside Box", weight: 10, note: "Especialista de área." },
          { name: "Shots on Target %", weight: 10, note: "Não pode desperdiçar." },
          { name: "Non-pen Goals/Shot", weight: 9, note: "Eficácia por remate." },
          { name: "xG Overperformance", weight: 9, note: "Superar a expectativa estatística." },
        ],
      },
      {
        name: "Avançado Completo (Complete Forward)",
        description: "Jogador total. Tem de ser bom em tudo o que um avançado faz.",
        metrics: [
          { name: "Goal Contributions/90", weight: 10, note: "Golos + Assistências." },
          { name: "xG + xA", weight: 10, note: "Impacto ofensivo total esperado." },
          { name: "Dribbles/90", weight: 9, note: "Técnica individual superior." },
          { name: "Headers Won %", weight: 9, note: "Presença física e aérea." },
          { name: "Key Passes", weight: 8, note: "Visão de jogo." },
        ],
      },
      {
        name: "Avançado Trabalhador (Pressing Forward)",
        description: "Primeiro defesa. Corre quilómetros para impedir a saída de bola e forçar erros.",
        metrics: [
          { name: "Pressures Attempted/90", weight: 10, note: "Intensidade de pressão." },
          { name: "Possession Won/90 (Final Third)", weight: 10, note: "Recuperar em zonas de golo." },
          { name: "Distance Covered/90", weight: 9, note: "Desgaste em prol da equipa." },
          { name: "Sprints/90", weight: 9, note: "Reação rápida à perda." },
          { name: "Goals/90", weight: 8, note: "Finalizar após esforço defensivo." },
        ],
      },
    ],
  },
];
