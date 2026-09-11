// Real learner activity: what actually happened in Learn, Practice and Solve.
// Everything Figuro claims about a learner must be derived from these events —
// never from invented sample data.

export const LEARNING_METHODS = [
  "reading",
  "example",
  "visual",
  "interactive",
  "video",
  "audio",
  "conversation",
  "practice",
  "game",
  "simulation",
] as const;

export type LearningMethod = (typeof LEARNING_METHODS)[number];

export const METHOD_LABEL: Record<LearningMethod, string> = {
  reading: "Written explanations",
  example: "Worked examples",
  visual: "Visual diagrams",
  interactive: "Interactive walkthroughs",
  video: "Short videos",
  audio: "Audio explanations",
  conversation: "Talking it through with the tutor",
  practice: "Practice questions",
  game: "Small challenges",
  simulation: "Simulations",
};

export type ActivityKind =
  | "tutor_explain"
  | "tutor_confused"
  | "tutor_question"
  | "tutor_check"
  | "practice_started"
  | "practice_attempt"
  | "practice_retry"
  | "hint_revealed"
  | "solve_question"
  | "method_feedback";

export type ActivityEvent = {
  id: string;
  lessonId: string;
  at: number;
  kind: ActivityKind;
  /** Short human label shown in Recent activity. */
  label: string;
  /** 0-100, only on graded practice attempts. */
  score?: number;
  weakConcepts?: string[];
  strongConcepts?: string[];
  method?: LearningMethod;
  /** For method_feedback: did the learner say it helped? */
  helped?: boolean;
};

export function makeEvent(e: Omit<ActivityEvent, "id" | "at">): ActivityEvent {
  return {
    ...e,
    id: `${e.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
  };
}

const norm = (s: string) => s.trim().toLowerCase();
const titleCase = (s: string) => s.trim().replace(/^\w/, (c) => c.toUpperCase());

export function relativeTime(at: number, now = Date.now()): string {
  const mins = Math.round((now - at) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export type WeakPoint = {
  concept: string;
  /** How many independent signals point at this concept. */
  signals: number;
  lessonId: string;
  reasons: string[];
};

/** Signals needed before Figuro flags a weak point. */
export const WEAK_POINT_THRESHOLD = 1;

export function isNoiseConcept(concept: string): boolean {
  if (!concept) return true;
  const trimmed = concept.trim();
  if (trimmed.length < 3) return true;
  if (/^(john|wiley|sons|inc|press|publisher|edition|volume|vol|author|copyright|isbn)$/i.test(trimmed)) return true;
  if (/john\s+wiley|wiley\s+&\s+sons|all\s+rights?\s+reserved/i.test(trimmed)) return true;
  if (/^point\s+\d+/i.test(trimmed)) return true;
  if (/^chapter\s+\d+/i.test(trimmed)) return true;
  if (/^page\s+\d+/i.test(trimmed)) return true;
  if (/^p\.\s*\d+$/i.test(trimmed)) return true;
  if (/\.(pdf|docx|txt|pptx)/i.test(trimmed)) return true;
  if (/^keys?$/i.test(trimmed)) return true;
  if (/table\s+of\s+contents/i.test(trimmed)) return true;
  if (/^material\s+filenames?$/i.test(trimmed)) return true;
  if (/^cell$/i.test(trimmed)) return true;
  return false;
}

export type ConceptRemediation = {
  concept: string;
  explanation: string;
  hints: string[];
  questions: {
    question: string;
    keywords: string[];
    hintIfWrong: string;
  }[];
};

export const CONCEPT_REMEDIATION_BANK: Record<string, ConceptRemediation> = {
  nucleus: {
    concept: "Nucleus",
    explanation: "The nucleus is the control center of the cell. It stores DNA and helps control cell activities and reproduction.",
    hints: [
      "Think about which organelle holds genetic blueprints (DNA).",
      "Recall the cell structure that directs cellular growth and protein synthesis.",
    ],
    questions: [
      {
        question: "Which part of the cell stores DNA and controls cell activities?",
        keywords: ["nucleus"],
        hintIfWrong: "Hint: It is the membrane-bound control center containing DNA.",
      },
      {
        question: "If a cell needs instructions for making proteins and dividing, which organelle supplies the DNA blueprints?",
        keywords: ["nucleus"],
        hintIfWrong: "Hint: The organelle storing DNA genetic instructions is the nucleus.",
      },
      {
        question: "What is the primary function of the nucleus in a eukaryotic cell?",
        keywords: ["control", "dna", "genetic", "store", "direct"],
        hintIfWrong: "Hint: It stores DNA and controls cell activities.",
      },
    ],
  },
  mitochondria: {
    concept: "Mitochondria",
    explanation: "Mitochondria are the powerhouses of the cell. They perform cellular respiration to convert fuel into ATP energy.",
    hints: [
      "Think about which organelle generates ATP energy.",
      "Recall the structure responsible for cellular respiration.",
    ],
    questions: [
      {
        question: "Which organelle generates ATP energy for the cell through cellular respiration?",
        keywords: ["mitochondria", "mitochondrion"],
        hintIfWrong: "Hint: It is known as the cellular powerhouse.",
      },
      {
        question: "What primary energy molecule is produced inside mitochondria during cellular respiration?",
        keywords: ["atp"],
        hintIfWrong: "Hint: Three-letter abbreviation for adenosine triphosphate.",
      },
      {
        question: "Why do active muscle cells contain more mitochondria than skin cells?",
        keywords: ["energy", "atp", "power", "fuel", "respiration"],
        hintIfWrong: "Hint: Muscle cells require massive amounts of ATP energy for continuous movement.",
      },
    ],
  },
  "cell membrane": {
    concept: "Cell Membrane",
    explanation: "The cell membrane is the outer boundary of the cell. It uses selective permeability to control what enters and leaves.",
    hints: [
      "Think about which structure acts as the selective barrier for the cell.",
      "Recall the term for letting some molecules in while blocking others.",
    ],
    questions: [
      {
        question: "Which cell structure controls what enters and leaves the cell through selective permeability?",
        keywords: ["cell membrane", "membrane", "plasma membrane"],
        hintIfWrong: "Hint: The semi-permeable lipid boundary enclosing the cell.",
      },
      {
        question: "What property allows the cell membrane to let nutrients in while keeping harmful wastes out?",
        keywords: ["selective", "permeability", "selectively permeable", "semipermeable"],
        hintIfWrong: "Hint: Selective permeability regulates molecular transport.",
      },
      {
        question: "What happens to a cell if its cell membrane loses its selective permeability?",
        keywords: ["enter", "leave", "die", "leak", "unregulated", "harmful", "toxins", "balance"],
        hintIfWrong: "Hint: Harmful substances rush in and essential nutrients leak out, disrupting cell balance.",
      },
    ],
  },
  "cell wall": {
    concept: "Cell Wall",
    explanation: "The cell wall is a rigid outer layer found in plant cells. It provides structural support, shape, and protection.",
    hints: [
      "Think about the rigid outer layer absent in animal cells.",
      "Recall what gives plant stems and leaves their sturdy shape.",
    ],
    questions: [
      {
        question: "Which rigid structure surrounds plant cells to provide shape and structural support?",
        keywords: ["cell wall", "wall"],
        hintIfWrong: "Hint: It is the tough outer layer outside the plant cell membrane.",
      },
      {
        question: "True or False: Animal cells possess a rigid cell wall for structural support.",
        keywords: ["false", "no", "incorrect"],
        hintIfWrong: "Hint: Cell walls are present in plant cells, fungi, and bacteria, but NOT animal cells.",
      },
    ],
  },
  chloroplasts: {
    concept: "Chloroplasts",
    explanation: "Chloroplasts are green organelles in plant cells that absorb sunlight to manufacture sugars via photosynthesis.",
    hints: [
      "Think about the organelle containing green chlorophyll.",
      "Recall where photosynthesis takes place inside plant cells.",
    ],
    questions: [
      {
        question: "Which organelle in plant cells absorbs sunlight to carry out photosynthesis?",
        keywords: ["chloroplast", "chloroplasts"],
        hintIfWrong: "Hint: Green organelles containing chlorophyll for photosynthesis.",
      },
      {
        question: "What process do chloroplasts perform to convert solar energy into chemical food (sugars)?",
        keywords: ["photosynthesis"],
        hintIfWrong: "Hint: The process of synthesizing food from light energy.",
      },
    ],
  },
};

export function getRemediationForConcept(concept: string): ConceptRemediation {
  const normConcept = concept.trim().toLowerCase();
  const matchedKey = Object.keys(CONCEPT_REMEDIATION_BANK).find((key) => normConcept.includes(key));
  if (matchedKey && CONCEPT_REMEDIATION_BANK[matchedKey]) {
    return CONCEPT_REMEDIATION_BANK[matchedKey]!;
  }
  return {
    concept: titleCase(concept),
    explanation: `${titleCase(concept)} is a core principle in this lesson. Review how key components interact to govern system behavior.`,
    hints: [
      `Focus on the main function of ${titleCase(concept)}.`,
      `Consider what happens when ${titleCase(concept)} is altered or disrupted.`,
    ],
    questions: [
      {
        question: `In your own words, what is the primary role of ${titleCase(concept)}?`,
        keywords: [normConcept, "control", "function", "process", "system", "role", "rule"],
        hintIfWrong: `Hint: Focus on the main action or function associated with ${titleCase(concept)}.`,
      },
      {
        question: `Describe what happens if ${titleCase(concept)} fails or is removed from the system.`,
        keywords: [normConcept, "fail", "stop", "change", "disrupt", "affect", "result"],
        hintIfWrong: `Hint: Consider the consequences of disrupting ${titleCase(concept)}.`,
      },
    ],
  };
}

export function detectWeakPoints(events: ActivityEvent[]): WeakPoint[] {
  const map = new Map<string, WeakPoint>();

  const bump = (concept: string, lessonId: string, reason: string) => {
    if (isNoiseConcept(concept)) return;
    const key = `${lessonId}::${norm(concept)}`;
    const existing = map.get(key);
    if (existing) {
      existing.signals += 1;
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
    } else {
      map.set(key, { concept: titleCase(concept), signals: 1, lessonId, reasons: [reason] });
    }
  };

  const reduce = (concept: string, lessonId: string) => {
    const key = `${lessonId}::${norm(concept)}`;
    const existing = map.get(key);
    if (existing) {
      existing.signals -= 1;
      if (existing.signals <= 0) {
        map.delete(key);
      }
    }
  };

  for (const e of events) {
    for (const c of e.weakConcepts ?? []) {
      const reason =
        e.kind === "practice_attempt"
          ? typeof e.score === "number" && e.score < 50
            ? `You got this question wrong (Score: ${e.score}%)`
            : "You got this question wrong"
          : e.kind === "hint_revealed"
            ? "Requested hint during practice"
            : "Flagged by tutor";
      bump(c, e.lessonId, reason);
    }

    // When learner shows strong mastery on a concept, reduce or clear weak point signal!
    for (const c of e.strongConcepts ?? []) {
      reduce(c, e.lessonId);
    }
  }

  // Behavioural signals attach to the lesson itself when no specific concept was named.
  const perLesson = new Map<string, { confused: number; hints: number; retries: number; low: number }>();
  for (const e of events) {
    const s = perLesson.get(e.lessonId) ?? { confused: 0, hints: 0, retries: 0, low: 0 };
    if (e.kind === "tutor_confused") s.confused += 1;
    if (e.kind === "hint_revealed") s.hints += 1;
    if (e.kind === "practice_retry") s.retries += 1;
    if (e.kind === "practice_attempt" && typeof e.score === "number" && e.score < 50) s.low += 1;
    perLesson.set(e.lessonId, s);
  }

  const out = [...map.values()];
  for (const [lessonId, s] of perLesson) {
    const reasons: string[] = [];
    if (s.confused >= 2) reasons.push(`said "I'm confused" ${s.confused} times`);
    if (s.hints >= 3) reasons.push(`asked for ${s.hints} hints`);
    if (s.retries >= 2) reasons.push(`retried practice ${s.retries} times`);
    if (s.low >= 2) reasons.push(`${s.low} attempts scored under 50%`);
    if (reasons.length && map.size === 0) {
      out.push({
        concept: "This lesson overall",
        signals: reasons.length,
        lessonId,
        reasons,
      });
    }
  }

  return out
    .filter((w) => w.signals >= WEAK_POINT_THRESHOLD)
    .sort((a, b) => b.signals - a.signals);
}

export type StrongPoint = { concept: string; signals: number; lessonId: string };

export function detectStrengths(events: ActivityEvent[]): StrongPoint[] {
  const map = new Map<string, StrongPoint>();
  for (const e of events) {
    if (e.kind === "practice_attempt" && typeof e.score === "number" && e.score < 60) continue;
    for (const c of e.strongConcepts ?? []) {
      const key = `${e.lessonId}::${norm(c)}`;
      const existing = map.get(key);
      if (existing) existing.signals += 1;
      else map.set(key, { concept: titleCase(c), signals: 1, lessonId: e.lessonId });
    }
  }
  return [...map.values()].sort((a, b) => b.signals - a.signals);
}

export type MethodTendency = {
  method: LearningMethod;
  tried: number;
  helped: number;
};

/** Data points needed before Figuro will describe a tendency at all. */
export const METHOD_THRESHOLD = 3;

export function methodTendencies(events: ActivityEvent[]): MethodTendency[] {
  const map = new Map<LearningMethod, MethodTendency>();
  for (const e of events) {
    if (!e.method) continue;
    const t = map.get(e.method) ?? { method: e.method, tried: 0, helped: 0 };
    t.tried += 1;
    if (e.helped) t.helped += 1;
    map.set(e.method, t);
  }
  return [...map.values()].sort((a, b) => b.helped - a.helped || b.tried - a.tried);
}

export function hasEnoughMethodEvidence(tendencies: MethodTendency[]): boolean {
  return tendencies.reduce((n, t) => n + t.tried, 0) >= METHOD_THRESHOLD;
}

export type Recommendation = {
  title: string;
  reason: string;
  /** Where the learner should go. */
  to: "/learn" | "/practice" | "/solve";
  lessonId: string;
  /** True when it is derived from the learner's own activity. */
  evidenceBased: boolean;
};

export function recommend(
  events: ActivityEvent[],
  lessons: { id: string; title: string; progress: number }[],
): Recommendation {
  const fallbackLesson = [...lessons].sort((a, b) => a.progress - b.progress)[0];

  const weak = detectWeakPoints(events)[0];
  if (weak) {
    const lesson = lessons.find((l) => l.id === weak.lessonId);
    return {
      title:
        weak.concept === "This lesson overall"
          ? `More practice on ${lesson?.title ?? "this lesson"}`
          : `Practice ${weak.concept}`,
      reason: `Based on your activity: ${weak.reasons.slice(0, 2).join(", ")}.`,
      to: "/practice",
      lessonId: weak.lessonId,
      evidenceBased: true,
    };
  }

  // Demonstrated understanding → move forward.
  const graded = events.filter((e) => e.kind === "practice_attempt" && typeof e.score === "number");
  const lastGraded = graded[graded.length - 1];
  if (lastGraded && (lastGraded.score ?? 0) >= 75) {
    const lesson = lessons.find((l) => l.id === lastGraded.lessonId);
    const next = lessons.find((l) => l.id !== lastGraded.lessonId && l.progress < 100) ?? lesson;
    return {
      title: `Move on to ${next?.title ?? "your next lesson"}`,
      reason: `Your last ${lesson?.title ?? "practice"} attempt scored ${lastGraded.score}% — that concept looks solid.`,
      to: "/learn",
      lessonId: next?.id ?? lastGraded.lessonId,
      evidenceBased: true,
    };
  }

  return {
    title: fallbackLesson ? `Start ${fallbackLesson.title}` : "Start a lesson",
    reason: "Not enough activity yet to personalise this — this is just your least-started lesson.",
    to: "/learn",
    lessonId: fallbackLesson?.id ?? "",
    evidenceBased: false,
  };
}
