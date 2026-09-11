/**
 * Figuro Local Tutor Engine.
 * 
 * Local, deterministic, topic-aware tutor implementation for Tutor (Learn), Practice, and Solve.
 * Features real topic concepts (Biology Cells, Thermodynamics, Linear Algebra, Stoicism, Limits, etc.)
 * and parses actual student study materials dynamically when available.
 * Filters out PDF headers, copyright, metadata, and noise artifacts.
 * Requires NO external AI APIs, gateways, or API keys.
 */

export type TutorMessage = { role: "user" | "assistant"; content: string };

export type TutorMode =
  | "explain"
  | "simpler"
  | "example"
  | "check"
  | "chat"
  | "visual"
  | "interactive"
  | "video"
  | "solve"
  | "next";

export type SourceMode = "materials" | "web";

export type OtherLessonSummary = {
  id: string;
  title: string;
  discipline: string;
  summaryText: string;
};

export type StudyContext = {
  locationPath: string;
  materialsText: string;
  unreadable: string[];
  hasReadableMaterials: boolean;
  otherLessons?: OtherLessonSummary[];
};

/**
 * Filter out PDF headers, copyright notices, ISBN numbers, page markers, 
 * filename noise, and generic extraction artifacts.
 */
export function cleanMaterialsText(rawText: string): string {
  if (!rawText) return "";
  const lines = rawText.split(/\r?\n/);
  const cleanLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.length < 6) return false;
    if (/chapter\s+\d+/i.test(trimmed)) return false;
    if (/all\s+rights?\s+reserved/i.test(trimmed)) return false;
    if (/copyright/i.test(trimmed)) return false;
    if (/isbn/i.test(trimmed)) return false;
    if (/point\s+\d+/i.test(trimmed)) return false;
    if (/page\s+\d+/i.test(trimmed)) return false;
    if (/\.(pdf|docx|pptx|txt)/i.test(trimmed) && trimmed.length < 40) return false;
    if (/^introduction\s+to/i.test(trimmed) && trimmed.length < 40) return false;
    if (/table\s+of\s+contents/i.test(trimmed)) return false;
    if (/^keys?$/i.test(trimmed)) return false;
    return true;
  });
  return cleanLines.join("\n");
}

export function buildSystemPrompt(
  lessonTitle: string,
  discipline: string,
  ctx?: StudyContext,
  sourceMode: SourceMode = "materials",
) {
  const lines = [
    `You are Figuro's Personalized Tutor for: "${lessonTitle}" (${discipline}).`,
    ctx?.locationPath ? `Studying path: ${ctx.locationPath}.` : "",
    `Source mode: ${sourceMode}.`,
  ];
  const cleaned = cleanMaterialsText(ctx?.materialsText ?? "");
  if (cleaned) {
    lines.push(`Materials summary available (${cleaned.length} chars).`);
  }
  return lines.filter(Boolean).join("\n");
}

export type TutorResult = {
  reply: string;
  error?: string;
  savedNote?: { id: string; title: string; content: string } | undefined;
};

/* ========================================================================== */
/* TOPIC KNOWLEDGE BANK                                                       */
/* ========================================================================== */

type TopicData = {
  matchKeys: string[];
  title: string;
  discipline: string;
  concepts: { name: string; fact: string; keywords: string[] }[];
  tutorSteps: {
    explanation: string;
    question: string;
    keywords: string[];
    successResponse: string;
  }[];
  practiceQuestions: {
    prompt: string;
    hints: string[];
    concepts: string[];
    requiredKeywords: string[];
  }[];
  solveSteps: {
    stepTitle: string;
    question: string;
    keywords: string[];
    hintIfWrong: string;
    idkExplanation?: string;
    successMsg: string;
  }[];
};

const KNOWLEDGE_BANK: TopicData[] = [
  {
    matchKeys: ["cell", "biology", "organelle", "membrane", "mitochondria", "nucleus"],
    title: "Cell Biology & Organelles",
    discipline: "Biology",
    concepts: [
      { name: "Nucleus", fact: "controls cell activities and stores genetic material (DNA)", keywords: ["nucleus", "dna", "control"] },
      { name: "Mitochondria", fact: "generate ATP energy for the cell through cellular respiration", keywords: ["mitochondria", "mitochondrion", "atp", "energy", "respiration"] },
      { name: "Cell Membrane", fact: "controls what enters and leaves the cell through selective permeability", keywords: ["cell membrane", "membrane", "selective", "permeability", "entry", "exit"] },
      { name: "Cell Wall", fact: "provides rigid structural support in plant cells", keywords: ["cell wall", "wall", "support", "rigid"] },
      { name: "Chloroplasts", fact: "absorb sunlight to perform photosynthesis in plant cells", keywords: ["chloroplast", "chloroplasts", "photosynthesis", "sunlight"] },
    ],
    tutorSteps: [
      {
        explanation: "Cells are the fundamental units of life. Inside each cell, specialized organelles carry out vital functions:\n\n• **Nucleus**: The control center containing DNA instructions for cell activities and reproduction.\n• **Mitochondria**: The cellular powerhouse producing ATP energy through cellular respiration.\n• **Cell Membrane**: The selective barrier regulating entry and exit of substances.",
        question: "Which organelle acts as the control center of the cell and stores genetic material (DNA)?",
        keywords: ["nucleus", "dna", "control"],
        successResponse: "Spot on! The **nucleus** is the control center that stores DNA and directs cell activities.",
      },
      {
        explanation: "Now let's examine cellular energy and boundaries:\n\n• **Mitochondria** convert nutrient sugars into ATP, the universal energy currency of the cell.\n• **Cell Membrane** uses selective permeability to let vital nutrients in while keeping toxins out.\n• Plant cells also contain a rigid **cell wall** for support and **chloroplasts** for photosynthesis.",
        question: "Which organelle is responsible for generating ATP energy through cellular respiration?",
        keywords: ["mitochondria", "mitochondrion", "atp", "energy", "respiration"],
        successResponse: "Exactly right! **Mitochondria** generate ATP energy through cellular respiration.",
      },
      {
        explanation: "Finally, let's contrast plant and animal cells:\n\nPlant cells possess two unique structures absent in animal cells:\n1. **Cell Wall**: A rigid outer boundary providing structural shape and support.\n2. **Chloroplasts**: Organelles containing chlorophyll that capture sunlight to manufacture food via photosynthesis.",
        question: "Name two structures found in plant cells but NOT in animal cells, and state what they do.",
        keywords: ["chloroplast", "cell wall", "photosynthesis", "wall"],
        successResponse: "Excellent! Plant cells have **chloroplasts** (for photosynthesis) and a rigid **cell wall** (for support).",
      },
    ],
    practiceQuestions: [
      {
        prompt: "A cell membrane is exposed to a chemical that disrupts its selective permeability. Describe what happens to the cell and explain why the cell membrane is essential.",
        hints: [
          "Think about what the cell membrane normally controls.",
          "Consider what happens when unregulated substances enter or exit.",
          "Selective permeability maintains internal cell balance.",
        ],
        concepts: ["Cell Membrane", "Selective Permeability"],
        requiredKeywords: ["membrane", "control", "enter", "leave", "permit", "balance", "select"],
      },
      {
        prompt: "Explain why plant cells require BOTH mitochondria and chloroplasts, while animal cells only have mitochondria.",
        hints: [
          "Chloroplasts absorb sunlight to synthesize sugars (photosynthesis).",
          "Mitochondria convert sugars into usable ATP energy (respiration).",
          "Plant cells must create their own food first before converting it to energy.",
        ],
        concepts: ["Chloroplasts", "Mitochondria", "Plant vs Animal"],
        requiredKeywords: ["chloroplast", "mitochondria", "photosynthesis", "energy", "sunlight", "food", "sugar", "atp"],
      },
      {
        prompt: "Describe the consequences to a cell if its nucleus is damaged or removed. What primary cellular functions fail?",
        hints: [
          "Recall that the nucleus contains DNA instructions.",
          "Without DNA instructions, protein synthesis and cell regulation stop.",
          "The nucleus directs growth, repair, and reproduction.",
        ],
        concepts: ["Nucleus", "DNA", "Cell Control"],
        requiredKeywords: ["nucleus", "dna", "control", "instruction", "activity", "protein", "die", "fail"],
      },
    ],
    solveSteps: [
      {
        stepTitle: "Step 1: Cell Classification",
        question: "A cell has a membrane-bound nucleus containing DNA. Is it **prokaryotic** or **eukaryotic**? Why?",
        keywords: ["eukaryotic", "eukaryote"],
        expectedAnswer: "eukaryotic",
        acceptedVariations: ["eukaryotic", "eukaryote", "the cell is eukaryotic", "it is eukaryotic", "eukaryotic cell"],
        hintIfWrong: "Hint: Cells that contain a true membrane-bound nucleus enclosing their genetic material (DNA) are classified as eukaryotic.",
        idkExplanation: "Eukaryotic cells possess a distinct membrane-bound nucleus storing DNA instructions. Prokaryotic cells (such as bacteria) lack a nucleus.",
        successMsg: "Correct! The presence of a nucleus confirms the cell is eukaryotic.",
      },
      {
        stepTitle: "Step 2: Cellular Energy Production",
        question: "The cell needs ATP energy for cellular processes. Which organelle produces most ATP through cellular respiration?",
        keywords: ["mitochondria", "mitochondrion"],
        expectedAnswer: "mitochondria",
        acceptedVariations: ["mitochondria", "mitochondrion", "the mitochondria", "mitochondria organelle"],
        hintIfWrong: "Hint: Think of the cellular powerhouse organelle that converts nutrients into ATP energy.",
        idkExplanation: "Mitochondria carry out cellular respiration, extracting energy from nutrients to generate ATP for cellular processes.",
        successMsg: "Right! Mitochondria generate ATP energy through cellular respiration.",
      },
      {
        stepTitle: "Step 3: Boundary & Transport Regulation",
        question: "The cell must control what enters and leaves to maintain internal balance. Which structure performs selective permeability?",
        keywords: ["cell membrane", "membrane", "plasma membrane"],
        expectedAnswer: "cell membrane",
        acceptedVariations: ["cell membrane", "membrane", "plasma membrane", "the cell membrane"],
        hintIfWrong: "Hint: The cell membrane acts as a selectively permeable barrier regulating what moves into and out of the cell.",
        idkExplanation: "The cell membrane uses selective permeability to let nutrients in while keeping harmful wastes out.",
        successMsg: "Problem Solved! The cell membrane uses selective permeability to maintain cellular balance.",
      },
    ],
  },
  {
    matchKeys: ["thermodynamics", "entropy", "heat", "energy", "disorder"],
    title: "Thermodynamics & Entropy",
    discipline: "Physics",
    concepts: [
      { name: "Entropy", fact: "measures disorder and the spread of energy in a system", keywords: ["entropy", "disorder", "spread", "energy"] },
      { name: "Second Law", fact: "states total entropy of an isolated system always increases over time", keywords: ["second law", "increases", "isolated"] },
      { name: "Heat Transfer", fact: "heat flows spontaneously from hotter bodies to colder bodies", keywords: ["heat", "hot", "cold", "flow"] },
    ],
    tutorSteps: [
      {
        explanation: "Thermodynamics governs how energy moves:\n• **Entropy** is the measure of energy dispersal and disorder in a system.\n• Systems naturally evolve from ordered states to higher entropy (disorder).",
        question: "State the concept of entropy in your own words without using the word 'disorder'.",
        keywords: ["dispersal", "spread", "energy", "arrangement", "states", "probability"],
        successResponse: "Great explanation! Entropy tracks energy dispersal across available states.",
      },
      {
        explanation: "The **Second Law of Thermodynamics** states that ΔS_universe ≥ 0 for any spontaneous process. Heat only flows from hot to cold spontaneously.",
        question: "When a hot cup of coffee cools down in a room, where did the 'lost' heat energy go?",
        keywords: ["room", "surrounding", "surroundings", "environment", "spread", "air"],
        successResponse: "Exactly! The heat transferred into the surrounding air, increasing total room entropy.",
      },
    ],
    practiceQuestions: [
      {
        prompt: "A refrigerator cools its inside box, which lowers local entropy. Explain why this does NOT violate the Second Law of Thermodynamics.",
        hints: [
          "The refrigerator is not an isolated system—it requires electrical work.",
          "Heat extracted from inside is dumped into the surrounding kitchen.",
          "The increase in kitchen entropy exceeds the entropy decrease inside the box.",
        ],
        concepts: ["Entropy", "Second Law", "Refrigeration"],
        requiredKeywords: ["refrigerator", "work", "compressor", "kitchen", "room", "surroundings", "total", "increase", "heat"],
      },
    ],
    solveSteps: [
      {
        stepTitle: "Step 1: System Boundary",
        question: "We place a cold metal bar against a hot metal bar inside an insulated box. Is heat transferred from hot to cold, or cold to hot?",
        keywords: ["hot to cold", "hot"],
        hintIfWrong: "Hint: Spontaneous heat flow always moves thermal energy from higher temperature to lower temperature.",
        idkExplanation: "Heat naturally flows from regions of higher thermal energy (hotter) to lower thermal energy (colder) until thermal equilibrium is reached.",
        successMsg: "Correct! Heat flows spontaneously from the hot bar to the cold bar.",
      },
      {
        stepTitle: "Step 2: Entropy Change",
        question: "Once both bars reach thermal equilibrium at equal temperature, has the total entropy of the system increased or decreased?",
        keywords: ["increased", "increase", "higher"],
        hintIfWrong: "Hint: According to the Second Law, spontaneous processes always result in an increase in total entropy.",
        idkExplanation: "The Second Law dictates that any spontaneous thermal transfer increases total system entropy.",
        successMsg: "Problem Solved! Total entropy increases as energy reaches thermal equilibrium.",
      },
    ],
  },
];

function getTopicData(lessonTitle: string, discipline: string, rawMaterialsText?: string): TopicData {
  const normTitle = (lessonTitle + " " + discipline).toLowerCase();
  const cleanedText = cleanMaterialsText(rawMaterialsText ?? "");

  const matched = KNOWLEDGE_BANK.find((k) =>
    k.matchKeys.some((key) => normTitle.includes(key)),
  );

  if (matched) {
    return matched;
  }

  if (cleanedText && cleanedText.length >= 30) {
    const sentences = cleanedText
      .split(/\n+|(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 25 && !/point\s+\d+/i.test(s) && !/chapter\s+\d+/i.test(s));

    if (sentences.length >= 2) {
      const concepts = sentences.slice(0, 5).map((s, i) => {
        const words = s.split(/\s+/).filter((w) => w.length >= 4 && !/^(this|that|these|those|which|where|because|about)$/i.test(w));
        const titleWord = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : `Concept ${i + 1}`;
        return {
          name: titleWord,
          fact: s,
          keywords: words.slice(0, 3).map((w) => w.toLowerCase()),
        };
      });

      return {
        matchKeys: [lessonTitle.toLowerCase()],
        title: lessonTitle,
        discipline: discipline,
        concepts,
        tutorSteps: sentences.slice(0, 3).map((s) => ({
          explanation: `From your study materials for **${lessonTitle}**:\n\n"${s}"\n\nThis core concept governs how ${lessonTitle} functions.`,
          question: `In your own words, what is the main takeaway from this statement?`,
          keywords: ["control", "process", "function", "system", "rule", "concept", "energy"],
          successResponse: `Spot on! You accurately explained the point from your ${lessonTitle} materials.`,
        })),
        practiceQuestions: sentences.slice(0, 3).map((s) => ({
          prompt: `Based on your ${lessonTitle} materials: "${s}" — Explain why this principle is essential and what happens if it is disrupted.`,
          hints: [
            `Focus on the statement: "${s.slice(0, 50)}..."`,
            `Consider the main role described.`,
            `Explain the consequences of disrupting this process.`,
          ],
          concepts: [lessonTitle, discipline],
          requiredKeywords: ["control", "function", "process", "system", "energy", "rule", "concept"],
        })),
        solveSteps: sentences.slice(0, 3).map((s, i) => ({
          stepTitle: `Step ${i + 1}: Analyzing Core Concept`,
          question: `Regarding your material note: "${s}" — What key concept or action is being described?`,
          keywords: ["process", "function", "system", "control", "concept", "rule"],
          hintIfWrong: `Hint: Reread the statement: "${s.slice(0, 60)}..."`,
          idkExplanation: `This material point states: "${s}". Focus on the main action or mechanism described.`,
          successMsg: `Correct! You identified the key component from your materials.`,
        })),
      };
    }
  }

  return {
    matchKeys: [],
    title: lessonTitle,
    discipline: discipline,
    concepts: [
      { name: `${lessonTitle} Core Rule`, fact: `main principle governing ${lessonTitle}`, keywords: [lessonTitle.toLowerCase(), "rule"] },
      { name: `${lessonTitle} Application`, fact: `practical usage of ${lessonTitle}`, keywords: [lessonTitle.toLowerCase(), "application"] },
    ],
    tutorSteps: [
      {
        explanation: `In ${discipline}, **${lessonTitle}** is focused on understanding core principles and operational rules. Key concepts interact to produce predictable outcomes.`,
        question: `What do you consider the most important concept in ${lessonTitle}?`,
        keywords: [lessonTitle.toLowerCase(), "rule", "concept", "principle", "main"],
        successResponse: `Great start! Understanding that principle is central to mastering ${lessonTitle}.`,
      },
      {
        explanation: `Next in **${lessonTitle}**, notice how changing one condition affects the entire system outcome.`,
        question: `Can you give an everyday example where ${lessonTitle} applies?`,
        keywords: ["example", "real", "use", "when", "system"],
        successResponse: `Excellent example! That illustrates how ${lessonTitle} works in real scenarios.`,
      },
    ],
    practiceQuestions: [
      {
        prompt: `Explain the fundamental principle of ${lessonTitle} (${discipline}) and work through one practical scenario step by step.`,
        hints: [
          `Start by defining ${lessonTitle} in your own words.`,
          `Identify the main rule or formula that governs it.`,
          `Describe what happens when inputs or conditions change.`,
        ],
        concepts: [lessonTitle, discipline],
        requiredKeywords: [lessonTitle.toLowerCase(), "principle", "rule", "example", "result"],
      },
    ],
    solveSteps: [
      {
        stepTitle: "Step 1: Identifying Problem State",
        question: `We have a problem involving ${lessonTitle}. What is the first step when analyzing this topic?`,
        keywords: ["identify", "given", "start", "read", "state"],
        hintIfWrong: "Hint: Begin by identifying what information is given and what you need to solve.",
        idkExplanation: "The first step in any problem-solving process is to list the given information and clarify the objective.",
        successMsg: "Correct! Identifying the initial state is step 1.",
      },
      {
        stepTitle: "Step 2: Applying the Rule",
        question: `Now apply the core rule of ${lessonTitle}. How do we reach the solution?`,
        keywords: ["apply", "rule", "calculate", "solve", "process"],
        hintIfWrong: "Hint: Apply the primary operational rule for this topic to the given data.",
        idkExplanation: "Applying the core operational rule to the input variables yields the expected outcome.",
        successMsg: "Problem Solved! Applying the core rule yields the complete solution.",
      },
    ],
  };
}

export function computeCurrentPartIndex(
  topic: TopicData,
  messages: TutorMessage[],
): number {
  let partIdx = 0;
  for (let i = 0; i < messages.length - 1; i++) {
    const turn = messages[i]!;
    if (turn.role === "user") {
      const userText = turn.content.toLowerCase();
      const step = topic.tutorSteps[partIdx];
      if (step) {
        const isCorrect = step.keywords.some((kw) => userText.includes(kw));
        const isNextCmd = /next section|next part|continue|move on|got it|makes sense|i understand/i.test(userText);

        const isSideOrSpecial =
          userText.includes("confus") ||
          userText.includes("explain again") ||
          userText.includes("what is") ||
          userText.includes("why ") ||
          userText.includes("how ") ||
          userText.includes("add this") ||
          userText.includes("save this") ||
          userText.includes("previous lesson");

        if ((isCorrect || isNextCmd) && !isSideOrSpecial) {
          partIdx = Math.min(partIdx + 1, topic.tutorSteps.length - 1);
        }
      }
    }
  }
  return partIdx;
}

export type SolveMessageCategory = "SIDE_QUESTION" | "STEP_ANSWER" | "I_DONT_KNOW" | "HINT_REQUEST";

export function classifySolveMessage(
  userText: string,
  currentStep: {
    question: string;
    stepTitle: string;
    keywords: string[];
    expectedAnswer?: string;
    acceptedVariations?: string[];
    hintIfWrong: string;
    idkExplanation?: string;
  },
  topic: TopicData,
): SolveMessageCategory {
  const trimmed = userText.trim();
  const norm = trimmed.toLowerCase();

  // 1. I_DONT_KNOW category
  if (
    /^(i don'?t know|idk|not sure|no idea|i have no idea|dont know)\b/i.test(norm)
  ) {
    return "I_DONT_KNOW";
  }

  // 2. HINT_REQUEST category
  if (
    /^(give me a hint|hint|need a hint|give hint|hint please|can i get a hint)\b/i.test(norm) ||
    norm === "hint" ||
    norm === "hint?"
  ) {
    return "HINT_REQUEST";
  }

  // 3. SIDE_QUESTION category:
  // a) Confusion / understanding help / question clarification
  if (
    norm.includes("don't understand") ||
    norm.includes("dont understand") ||
    norm.includes("cant understand") ||
    norm.includes("im confused") ||
    norm.includes("i am confused") ||
    norm.includes("confused") ||
    norm.includes("explain the question") ||
    norm.includes("what is the question asking") ||
    norm.includes("what is this asking") ||
    norm.includes("what to do")
  ) {
    return "SIDE_QUESTION";
  }

  // b) Short interrogatives
  if (/^(why|why\?|why is that|how|how\?|explain|explain this|can you explain|help|what|what\?)$/i.test(norm)) {
    return "SIDE_QUESTION";
  }

  // c) Side question / definition / clarification patterns (with typos)
  const sideQuestionPatterns = [
    /\b(whais|whats|what's|wat is|wats is|what is|whut is|wht is|whatis)\b/i,
    /\b(what does|wat does|what do|what dose|what dis|what ths|what is ths|what is this|what does that mean|what does this mean)\b/i,
    /\b(why is|whys|why does|why do|why so)\b/i,
    /\b(how does|how do|how comes|how is)\b/i,
    /\b(can you explain|can u explain|could you explain|please explain|explain this|explain what|esplain|expln)\b/i,
    /\b(define|definition of|meaning of|what is meant by)\b/i,
    /\b(what word|this word|word mean)\b/i,
  ];

  if (sideQuestionPatterns.some((p) => p.test(norm))) {
    return "SIDE_QUESTION";
  }

  // d) Interrogative starters at the beginning of the message
  if (/^(wha|wat|wats|whats|whais|wht|why|how|who|where|when|can u|can you|could u|could you|tell me|explain|esplain|define)\b/i.test(trimmed)) {
    return "SIDE_QUESTION";
  }

  // e) Ends with '?' and starts with interrogative or is asking for clarification (3+ words)
  const words = trimmed.split(/\s+/);
  if (norm.endsWith("?") && words.length >= 3) {
    if (/^(what|why|how|who|where|when|is|does|can|meaning|define|explain)\b/i.test(norm)) {
      return "SIDE_QUESTION";
    }
  }

  return "STEP_ANSWER";
}

export function answerSideQuestion(
  text: string,
  topic: TopicData,
  discipline: string,
  currentStep?: {
    question: string;
    stepTitle: string;
    hintIfWrong: string;
    idkExplanation?: string;
  },
): string {
  const norm = text.toLowerCase();

  // 1. If asking what the question means or what to do:
  if (
    norm.includes("explain the question") ||
    norm.includes("what is the question asking") ||
    norm.includes("what is this asking") ||
    norm.includes("what to do") ||
    norm.includes("dont understand") ||
    norm.includes("don't understand") ||
    norm.includes("confused")
  ) {
    return `Here is what this step is asking:\n\n"${currentStep?.question ?? topic.solveSteps[0]?.question}"\n\nReview the options or keywords mentioned in the question and type your answer below.`;
  }

  // 2. Dictionary of key definitions across subjects
  const dictionary: Record<string, string> = {
    prokaryotic: "A prokaryotic cell is a single-celled organism (such as bacteria) that lacks a distinct, membrane-bound nucleus and membrane-bound organelles.",
    prokaryote: "A prokaryotic cell is a single-celled organism (such as bacteria) that lacks a distinct, membrane-bound nucleus and membrane-bound organelles.",
    eukaryotic: "A eukaryotic cell is a cell that contains a distinct, membrane-bound nucleus storing its genetic material (DNA), along with membrane-bound organelles.",
    eukaryote: "A eukaryotic cell is a cell that contains a distinct, membrane-bound nucleus storing its genetic material (DNA), along with membrane-bound organelles.",
    atp: "ATP (Adenosine Triphosphate) is the primary energy currency used by cells to power biological work and cellular processes, produced mainly by mitochondria.",
    mitochondria: "Mitochondria are the powerhouse organelles of eukaryotic cells that generate ATP energy through cellular respiration.",
    mitochondrion: "Mitochondria are the powerhouse organelles of eukaryotic cells that generate ATP energy through cellular respiration.",
    nucleus: "The nucleus is the membrane-bound organelle that acts as the control center of a eukaryotic cell, storing genetic instructions (DNA).",
    dna: "DNA (Deoxyribonucleic Acid) is the double-helix molecule storing genetic instructions for building proteins and directing cellular growth and reproduction.",
    "cell membrane": "The cell membrane is a selectively permeable barrier surrounding the cell that controls what molecules enter and exit.",
    membrane: "The cell membrane is a selectively permeable barrier surrounding the cell that controls what molecules enter and exit.",
    "cell wall": "The cell wall is a rigid outer boundary found in plant cells and bacteria that provides structural support and protection.",
    chloroplast: "Chloroplasts are plant cell organelles containing chlorophyll that capture sunlight to synthesize food via photosynthesis.",
    chloroplasts: "Chloroplasts are plant cell organelles containing chlorophyll that capture sunlight to synthesize food via photosynthesis.",
    photosynthesis: "Photosynthesis is the process by which plant cells use solar energy, water, and carbon dioxide to manufacture glucose sugar.",
    entropy: "Entropy is a thermodynamic measure of disorder, randomness, and the dispersal of energy within a system.",
    "second law": "The Second Law of Thermodynamics states that the total entropy of an isolated system always increases over time in any spontaneous process.",
    heat: "Heat is thermal energy in transit between systems due to a temperature difference, flowing spontaneously from hotter to colder bodies.",
    variable: "In mathematics and programming, a variable is a named storage container or symbol used to represent a value that can change.",
    function: "A function is a reusable block of code or mathematical mapping that takes inputs, performs operations, and produces an output.",
    equation: "An equation is a mathematical statement showing that two expressions are equal, typically separated by an equals sign (=).",
  };

  for (const [key, def] of Object.entries(dictionary)) {
    if (norm.includes(key)) {
      return def;
    }
  }

  // 3. Search concepts across the entire topic
  const matchedConcept = topic.concepts.find((c) =>
    c.keywords.some((kw) => norm.includes(kw.toLowerCase())) ||
    norm.includes(c.name.toLowerCase()),
  );

  if (matchedConcept) {
    return `Regarding **${matchedConcept.name}**: ${matchedConcept.fact}.`;
  }

  // 4. Search ALL steps in topic.solveSteps (Step 1, Step 2, Step 3)
  for (const step of topic.solveSteps) {
    if (step.idkExplanation && step.keywords.some((kw) => norm.includes(kw.toLowerCase()))) {
      return `Regarding that concept in **${topic.title}**:\n\n${step.idkExplanation}`;
    }
  }

  // 5. Extract term being asked for custom terms
  const termMatch = norm.match(/(?:what is|what's|whais|wat is|define|explain|meaning of)\s+(?:a\s+|an\s+|the\s+)?([a-z0-9\s-]+)/i);
  if (termMatch && termMatch[1]) {
    const term = termMatch[1].trim().replace(/\?$/, "");
    if (term.length > 2) {
      return `Regarding **${term}**: In ${topic.title} (${discipline}), **${term}** is a key concept that defines how elements in this subject interact.`;
    }
  }

  return `In **${topic.title}** (${discipline}), this addresses how key principles interact to maintain function and solve the problem.`;
}

export function isPreviousLessonQuery(text: string): boolean {
  const norm = text.toLowerCase();
  return (
    norm.includes("previous lesson") ||
    norm.includes("earlier lesson") ||
    norm.includes("learned this in my previous") ||
    norm.includes("learned this earlier") ||
    norm.includes("from my old lesson") ||
    norm.includes("my other lesson") ||
    norm.includes("learned before")
  );
}

export function searchPreviousLessons(text: string, topic: TopicData, ctx?: StudyContext): string {
  const norm = text.toLowerCase();
  const others = ctx?.otherLessons ?? [];

  if (others.length > 0) {
    const matched = others.find((ol) =>
      norm.includes(ol.title.toLowerCase()) ||
      norm.includes(ol.discipline.toLowerCase()) ||
      ol.summaryText.toLowerCase().split(/\s+/).some((w) => w.length > 4 && norm.includes(w)),
    ) ?? others[0];

    if (matched) {
      return `In your previous lesson on **${matched.title}** (${matched.discipline}), you explored key ideas: *"${matched.summaryText.slice(0, 140)}..."*\n\nConnecting that to **${topic.title}**: We build directly on those principles to understand how specialized mechanisms function!`;
    }
  }
  return `I searched your Figuro lessons and notes, but don't see a previous lesson on that specific topic yet. Let's focus on mastering this concept right here in **${topic.title}**!`;
}

export function isActionRequest(text: string): boolean {
  const norm = text.toLowerCase();
  return (
    norm.includes("watch") ||
    norm.includes("open resource") ||
    norm.includes("visit website") ||
    norm.includes("external link") ||
    norm.includes("download file")
  );
}

function getSimplerExplanationForPart(
  topic: TopicData,
  partIdx: number,
  partNumber: number,
  totalParts: number,
): string {
  const tutorStep = topic.tutorSteps[partIdx] ?? topic.tutorSteps[0]!;

  if (topic.title.includes("Cell") || topic.matchKeys.includes("cell")) {
    if (partIdx === 0) {
      return `Let's make **Part 1 (The Nucleus)** crystal clear using a City Hall analogy:\n\n` +
        `• **Nucleus = City Hall / Headquarters**: It holds the master town blueprints (**DNA**) and directs all cell operations.\n\n` +
        `Does this city hall analogy make the nucleus's role clearer?\n\n` +
        `**Quick Check for Part 1**: ${tutorStep.question}`;
    }
    if (partIdx === 1) {
      return `Let me make **Part 2 (Energy & Boundaries)** crystal clear with a Factory analogy:\n\n` +
        `• **Mitochondria = Power Plant**: Burns fuel to produce electricity (**ATP energy**) that powers every cell action.\n` +
        `• **Cell Membrane = Security Gates**: Uses **selective permeability** to check what enters and leaves.\n\n` +
        `Let's try again for **Part 2 of ${totalParts}**: ${tutorStep.question}`;
    }
    return `Let me simplify **Part 3 (Plant Cell Extras)**:\n\n` +
      `• **Cell Wall = Rigid Fortress**: Strong outer wall keeping plant cells standing upright.\n` +
      `• **Chloroplasts = Solar Panels**: Captures sunlight to manufacture food via photosynthesis.\n\n` +
      `Let's try again for **Part 3 of ${totalParts}**: ${tutorStep.question}`;
  }

  const concept = topic.concepts[partIdx] ?? topic.concepts[0];
  return `Let's break down **Part ${partNumber} of ${totalParts} (${concept?.name ?? topic.title})** into plain language:\n\n` +
    `• **Main Idea**: ${concept?.fact ?? tutorStep.explanation}\n` +
    `• **Key takeaway**: Each component plays a specific role to keep the system balanced.\n\n` +
    `Let's try again for **Part ${partNumber} of ${totalParts}**:\n${tutorStep.question}`;
}

function getExampleForPart(
  topic: TopicData,
  partIdx: number,
  partNumber: number,
  totalParts: number,
): string {
  const tutorStep = topic.tutorSteps[partIdx] ?? topic.tutorSteps[0]!;

  if (topic.title.includes("Cell") || topic.matchKeys.includes("cell")) {
    if (partIdx === 0) {
      return `Here is a concrete example for **Part 1 (Nucleus & DNA)**:\n\n` +
        `**Red Blood Cells vs White Blood Cells**\n` +
        `• Mature Red Blood Cells eject their **nucleus** to fit maximum oxygen.\n` +
        `• White Blood Cells keep a large **nucleus** so they can read DNA and create antibodies to fight illness.\n\n` +
        `**Quick Check for Part 1**: ${tutorStep.question}`;
    }
    if (partIdx === 1) {
      return `Here is a concrete example for **Part 2 (Mitochondria & Cell Membrane)**:\n\n` +
        `**Muscle Cells vs Skin Cells**\n` +
        `• Muscle cells work constantly and need high energy, so they have thousands of **mitochondria** producing **ATP**.\n` +
        `• Skin cells need tight protection, relying on their **cell membrane** for barrier control.\n\n` +
        `**Quick Check for Part 2**: ${tutorStep.question}`;
    }
  }

  return `Here is a worked example for **Part ${partNumber} of ${totalParts} (${topic.title})**:\n\n` +
    `1. **Scenario**: We observe ${topic.concepts[partIdx]?.name ?? "the core concept"} in action.\n` +
    `2. **Mechanism**: ${topic.concepts[partIdx]?.fact ?? tutorStep.explanation}\n\n` +
    `**Quick Check for Part ${partNumber}**: ${tutorStep.question}`;
}

function getVisualCardForPart(
  topic: TopicData,
  partIdx: number,
  partNumber: number,
  totalParts: number,
): string {
  const tutorStep = topic.tutorSteps[partIdx] ?? topic.tutorSteps[0]!;

  if (topic.title.includes("Cell") || topic.matchKeys.includes("cell")) {
    if (partIdx === 0) {
      return `📊 **Visual Diagram Card: Part 1 — The Control Center**\n\n` +
        `🔹 **Nucleus**\n` +
        `├─ Role: Control center & regulation\n` +
        `└─ Stores: DNA (Genetic Instructions)\n\n` +
        `**Quick Check for Part 1**: ${tutorStep.question}`;
    }
    if (partIdx === 1) {
      return `📊 **Visual Diagram Card: Part 2 — Energy & Boundaries**\n\n` +
        `⚡ **Mitochondria**\n` +
        `├─ Role: Cellular Powerhouse\n` +
        `└─ Output: ATP Energy via Respiration\n\n` +
        `🛡️ **Cell Membrane**\n` +
        `├─ Role: Boundary & Transport\n` +
        `└─ Mechanism: Selective Permeability\n\n` +
        `**Quick Check for Part 2**: ${tutorStep.question}`;
    }
    return `📊 **Visual Diagram Card: Part 3 — Plant Cell Extras**\n\n` +
      `🌱 **Plant Cell Extras**\n` +
      `├─ Cell Wall: Rigid structural protection\n` +
      `└─ Chloroplasts: Photosynthesis (Sunlight → Sugar)\n\n` +
      `**Quick Check for Part 3**: ${tutorStep.question}`;
  }

  return `📊 **Visual Diagram Card: Part ${partNumber} of ${totalParts}**\n\n` +
    `🔹 **${topic.concepts[partIdx]?.name ?? topic.title}**\n` +
    `└─ Function: ${topic.concepts[partIdx]?.fact ?? tutorStep.explanation}\n\n` +
    `**Quick Check**: ${tutorStep.question}`;
}

export function isAnswerMatchingStep(
  userAnswer: string,
  step: {
    keywords: string[];
    expectedAnswer?: string;
    acceptedVariations?: string[];
  },
): boolean {
  const norm = userAnswer
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!norm) return false;

  // 1. Direct expectedAnswer check
  if (step.expectedAnswer) {
    const expNorm = step.expectedAnswer.toLowerCase().trim();
    if (norm === expNorm || norm.includes(expNorm)) return true;
  }

  // 2. acceptedVariations check
  if (step.acceptedVariations && step.acceptedVariations.length > 0) {
    for (const varItem of step.acceptedVariations) {
      const varNorm = varItem.toLowerCase().trim();
      if (norm === varNorm || norm.includes(varNorm)) return true;
    }
  }

  // 3. Keyword check
  for (const kw of step.keywords) {
    const normKw = kw.toLowerCase().trim();
    if (!normKw) continue;
    if (norm.includes(normKw)) return true;
  }

  return false;
}

export async function callTutor(params: {
  lessonTitle: string;
  discipline: string;
  mode: TutorMode;
  messages: TutorMessage[];
  ctx?: StudyContext | undefined;
  sourceMode?: SourceMode | undefined;
  savedNoteInfo?: { id: string; title: string; content: string } | undefined;
}): Promise<TutorResult> {
  const topic = getTopicData(params.lessonTitle, params.discipline, params.ctx?.materialsText);
  const userMessages = params.messages.filter((m) => m.role === "user");
  const lastUserMsg = userMessages[userMessages.length - 1]?.content ?? "";

  // --------------------------------------------------------------------------
  // 1. SOLVE MODE: Guided Step-by-Step Problem Solving
  // --------------------------------------------------------------------------
  if (params.mode === "solve") {
    const assistantMessages = params.messages.filter((m) => m.role === "assistant");
    const lastAssistantMsg = assistantMessages[assistantMessages.length - 1]?.content ?? "";

    // If no assistant message has been sent yet (this is the start of the session):
    if (!lastAssistantMsg) {
      const firstStep = topic.solveSteps[0]!;
      return {
        reply: `Welcome to Guided Problem Solving for ${topic.title}.\n\n${firstStep.stepTitle}\n${firstStep.question}`,
      };
    }

    // Find which step index was presented in the last assistant message
    let activeStepIdx = 0;
    for (let s = topic.solveSteps.length - 1; s >= 0; s--) {
      const step = topic.solveSteps[s]!;
      if (
        lastAssistantMsg.includes(step.stepTitle) ||
        lastAssistantMsg.toLowerCase().includes(`step ${s + 1}`) ||
        (step.question && lastAssistantMsg.includes(step.question.slice(0, 20)))
      ) {
        activeStepIdx = s;
        break;
      }
    }

    const currentStep = topic.solveSteps[activeStepIdx]!;
    // 1. CLASSIFY MESSAGE BEFORE ANY ANSWER EVALUATION
    const category = classifySolveMessage(lastUserMsg, currentStep, topic);

    // Branch 1: I_DONT_KNOW
    if (category === "I_DONT_KNOW") {
      const explanation = currentStep.idkExplanation ?? currentStep.hintIfWrong;
      return {
        reply: `Let me explain this step briefly:\n\n${explanation}\n\nNow try ${currentStep.stepTitle} again:\n${currentStep.question}`,
      };
    }

    // Branch 2: HINT_REQUEST
    if (category === "HINT_REQUEST") {
      return {
        reply: `Here is a hint for ${currentStep.stepTitle}:\n\n${currentStep.hintIfWrong}\n\nNow try again:\n${currentStep.question}`,
      };
    }

    // Branch 3: SIDE_QUESTION
    if (category === "SIDE_QUESTION") {
      const sideReply = answerSideQuestion(lastUserMsg, topic, params.discipline, currentStep);
      return {
        reply: `${sideReply}\n\nNow try ${currentStep.stepTitle} again:\n${currentStep.question}`,
      };
    }

    // Branch 4: STEP_ANSWER — ONLY THIS BRANCH CALLS ANSWER EVALUATION!
    const isCorrect = isAnswerMatchingStep(lastUserMsg, currentStep);

    if (isCorrect) {
      const nextStepIdx = activeStepIdx + 1;
      if (nextStepIdx < topic.solveSteps.length) {
        const nextStep = topic.solveSteps[nextStepIdx]!;
        return {
          reply: `${currentStep.successMsg}\n\n${nextStep.stepTitle}\n${nextStep.question}`,
        };
      } else {
        return {
          reply: `${currentStep.successMsg}\n\nProblem Solved! You navigated all steps correctly without needing the final answer handed to you!`,
        };
      }
    }

    // If wrong: stay on the SAME step, show hint & allow another attempt
    return {
      reply: `Not quite yet.\n\nHint: ${currentStep.hintIfWrong}\n\nTry again for ${currentStep.stepTitle}:\n${currentStep.question}`,
    };
  }

  // --------------------------------------------------------------------------
  // 2. TUTOR ENGINE: Part-by-part teaching & persistent session state
  // --------------------------------------------------------------------------
  const currentPartIdx = computeCurrentPartIndex(topic, params.messages);
  const tutorStep = topic.tutorSteps[currentPartIdx] ?? topic.tutorSteps[0]!;
  const currentPartNumber = currentPartIdx + 1;
  const totalParts = topic.tutorSteps.length;

  let reply = "";

  // Check 1: User requested note saving (savedNoteInfo passed from server function)
  if (params.savedNoteInfo) {
    reply = `Saved to notes! I've added "${params.savedNoteInfo.title}" to your study notes for ${topic.title}.\n\nNow, returning to Part ${currentPartNumber} of ${totalParts}:\n${tutorStep.question}`;
    return { reply, savedNote: params.savedNoteInfo };
  }

  // Check 2: Learner asks about previous lesson context
  if (isPreviousLessonQuery(lastUserMsg)) {
    const prevContextReply = searchPreviousLessons(lastUserMsg, topic, params.ctx);
    reply = `${prevContextReply}\n\nNow, back to Part ${currentPartNumber} of ${totalParts}:\n${tutorStep.question}`;
    return { reply };
  }

  // Check 3: Action requests
  if (isActionRequest(lastUserMsg)) {
    reply = `In Figuro, you can view attached files under Sources above, use Audio Lesson or Show Diagram buttons, or switch to Continue Practice to test yourself!\n\nNow, back to Part ${currentPartNumber} of ${totalParts}:\n${tutorStep.question}`;
    return { reply };
  }

  // Check 4: Learner asks side question
  if (isSideQuestion(lastUserMsg) && (params.mode === "chat" || params.mode === "explain")) {
    const directAns = answerSideQuestion(lastUserMsg, topic, params.discipline);
    reply = `${directAns}\n\nNow, back to Part ${currentPartNumber} of ${totalParts}:\n${tutorStep.question}`;
    return { reply };
  }

  // Check 5: Explicit "Next Part" or "Finish Lesson" navigation
  const isExplicitNext =
    params.mode === "next" ||
    /next section|next part|finish lesson/i.test(lastUserMsg.toLowerCase());

  if (isExplicitNext) {
    const nextIdx = currentPartIdx + 1;
    if (nextIdx < totalParts) {
      const nextStep = topic.tutorSteps[nextIdx]!;
      reply = `### Part ${nextIdx + 1} of ${totalParts}: ${topic.concepts[nextIdx]?.name ?? "Next Concept"}\n\n${nextStep.explanation}\n\n**Quick Check**: ${nextStep.question}`;
    } else {
      reply = `All ${totalParts} Parts Complete! You've covered all core points for ${topic.title}! Ask me any questions, save notes, or click Continue Practice below to test your understanding.`;
    }
    return { reply };
  }

  // Check 6: Tutor Modes
  switch (params.mode) {
    case "explain":
    case "chat": {
      const isStartRequest =
        userMessages.length <= 1 ||
        lastUserMsg.toLowerCase().includes("from the start") ||
        lastUserMsg.toLowerCase().includes("explain cells");

      if (isStartRequest) {
        reply = `### Part ${currentPartNumber} of ${totalParts}: ${topic.concepts[currentPartIdx]?.name ?? "Core Concept"}\n\n${tutorStep.explanation}\n\n**Quick Check**: ${tutorStep.question}`;
      } else {
        const normAns = lastUserMsg.toLowerCase();
        const recognized = tutorStep.keywords.some((kw) => normAns.includes(kw));

        if (!recognized) {
          reply = `Not quite. In ${topic.title}, answers should refer to the specific key concepts of this section.\n\nHint: ${tutorStep.question.includes("DNA") || tutorStep.question.includes("control") ? "Think about the organelle storing genetic blueprints (DNA)." : tutorStep.question.includes("ATP") || tutorStep.question.includes("energy") ? "Think about the powerhouse organelle that generates ATP energy." : "Consider the unique structures in plant cells like cell wall and chloroplasts."}\n\nTry again for Part ${currentPartNumber} of ${totalParts}: ${tutorStep.question}`;
        } else {
          const nextIdx = currentPartIdx + 1;
          if (nextIdx < totalParts) {
            const nextStep = topic.tutorSteps[nextIdx]!;
            reply = `${tutorStep.successResponse}\n\n### Part ${nextIdx + 1} of ${totalParts}: ${topic.concepts[nextIdx]?.name ?? "Next Concept"}\n\n${nextStep.explanation}\n\n**Next Check**: ${nextStep.question}`;
          } else {
            reply = `${tutorStep.successResponse}\n\nAll ${totalParts} Parts Complete! You've covered all core points for ${topic.title}! Ask me any questions, save notes, or click Continue Practice below to test your understanding.`;
          }
        }
      }
      break;
    }

    case "simpler": {
      reply = getSimplerExplanationForPart(topic, currentPartIdx, currentPartNumber, totalParts);
      break;
    }

    case "example": {
      reply = getExampleForPart(topic, currentPartIdx, currentPartNumber, totalParts);
      break;
    }

    case "check": {
      reply = `Quick Check Question for Part ${currentPartNumber} of ${totalParts}:\n\n${tutorStep.question}`;
      break;
    }

    case "visual": {
      reply = getVisualCardForPart(topic, currentPartIdx, currentPartNumber, totalParts);
      break;
    }

    case "interactive": {
      reply = `Interactive Walkthrough: Part ${currentPartNumber} of ${totalParts}\n\n${tutorStep.explanation}\n\n**Your Turn**: ${tutorStep.question}`;
      break;
    }

    case "audio": {
      reply = `Audio Lesson: Part ${currentPartNumber} of ${totalParts}\n\n"${tutorStep.explanation.replace(/\n+/g, " ")}"\n\n**Quick Check**: ${tutorStep.question}`;
      break;
    }

    default: {
      reply = `I am ready to help you master Part ${currentPartNumber} of ${totalParts} for ${topic.title}. What would you like to practice or clarify?`;
      break;
    }
  }

  return { reply };
}

/* ========================================================================== */
/* 2. PRACTICE ENGINE (`generatePracticeActivity` & `gradeAttempt`)           */
/* ========================================================================== */

export type PracticeActivity = {
  prompt: string;
  hints: string[];
  concepts: string[];
};

export type PracticeActivityResult = { activity?: PracticeActivity; error?: string };

export async function generatePracticeActivity(params: {
  lessonTitle: string;
  discipline: string;
  avoid?: string[] | undefined;
  ctx?: StudyContext | undefined;
}): Promise<PracticeActivityResult> {
  const topic = getTopicData(params.lessonTitle, params.discipline, params.ctx?.materialsText);
  const avoidList = (params.avoid ?? []).map((a) => a.toLowerCase());

  const selected =
    topic.practiceQuestions.find(
      (q) => !avoidList.some((a) => a.includes(q.prompt.slice(0, 30).toLowerCase())),
    ) ?? topic.practiceQuestions[Math.floor(Math.random() * topic.practiceQuestions.length)]!;

  return {
    activity: {
      prompt: selected.prompt,
      hints: selected.hints,
      concepts: selected.concepts,
    },
  };
}

export type AttemptFeedback = {
  strengths: string[];
  gaps: string[];
  nudge: string;
  understanding: number;
  weakConcepts: string[];
  strongConcepts: string[];
  suggestedMethod: string;
};

export type AttemptFeedbackResult = { feedback?: AttemptFeedback; error?: string };

export async function gradeAttempt(params: {
  lessonTitle: string;
  discipline: string;
  activityPrompt: string;
  attempt: string;
  hintsUsed: number;
  attemptNumber: number;
  ctx?: StudyContext | undefined;
}): Promise<AttemptFeedbackResult> {
  const topic = getTopicData(params.lessonTitle, params.discipline, params.ctx?.materialsText);
  const attemptText = params.attempt.trim().toLowerCase();
  const wordCount = attemptText.split(/\s+/).filter(Boolean).length;

  const matchedQuestion = topic.practiceQuestions.find((q) =>
    params.activityPrompt.toLowerCase().includes(q.prompt.slice(0, 30).toLowerCase()),
  ) ?? topic.practiceQuestions[0];

  const targetConcept = matchedQuestion?.concepts[0] ?? topic.concepts[0]?.name ?? params.lessonTitle;

  const allKeywords = matchedQuestion
    ? matchedQuestion.requiredKeywords
    : Array.from(new Set(topic.practiceQuestions.flatMap((q) => q.requiredKeywords)));

  const matchedKeywords = allKeywords.filter((kw) => attemptText.includes(kw));

  let score = Math.min(100, Math.max(35, Math.round(wordCount * 5) + matchedKeywords.length * 20));
  if (params.hintsUsed > 1) score = Math.max(30, score - (params.hintsUsed - 1) * 5);

  const isStrong = score >= 70;

  const strengths: string[] = [
    `You provided a detailed reasoning response for ${params.lessonTitle}.`,
  ];
  if (matchedKeywords.length > 0) {
    strengths.push(`Correctly referenced key concepts: ${matchedKeywords.slice(0, 3).join(", ")}.`);
  }

  const gaps: string[] = [];
  if (!isStrong) {
    gaps.push(`You got this question wrong — let's work on it.`);
    const missing = allKeywords.filter((kw) => !matchedKeywords.includes(kw)).slice(0, 2);
    if (missing.length > 0) {
      gaps.push(`Consider mentioning how ${missing.join(" and ")} relate to ${targetConcept}.`);
    } else {
      gaps.push(`Elaborate further on the specific mechanisms of ${targetConcept}.`);
    }
  }

  return {
    feedback: {
      strengths,
      gaps,
      nudge: isStrong
        ? `Nice! You understand ${targetConcept} better now.`
        : `You got this question wrong — let's work on ${targetConcept}.`,
      understanding: score,
      weakConcepts: isStrong ? [] : [targetConcept],
      strongConcepts: isStrong ? [targetConcept] : [],
      suggestedMethod: isStrong ? "practice" : "example",
    },
  };
}
