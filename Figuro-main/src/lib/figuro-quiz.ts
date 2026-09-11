/**
 * Figuro Local Quiz & Practice Engine.
 * Ported & merged from Figuro-Day3-Test.
 * 
 * Generates local, deterministic quiz and practice questions directly from 
 * lesson study materials or preset practice items without requiring external APIs.
 */

export type QuestionType =
  | "multiple-choice"
  | "true-false"
  | "short-answer"
  | "fill-blank";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type QuizQuestion = {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string;
  concept: string;
  difficulty: Difficulty;
  sourceText: string;
};

export type QuizResult = {
  question: QuizQuestion;
  userAnswer: string;
  correct: boolean;
};

export type Day3PracticeQuestion = {
  question: string;
  options: string[];
  answer: string;
  concept: string;
  difficulty: Difficulty;
};

/** Day 3 default local practice question deck */
export const DAY3_PRACTICE_QUESTIONS: Day3PracticeQuestion[] = [
  {
    question: "What is the main function of the cell membrane?",
    options: [
      "It controls what enters and leaves the cell",
      "It produces DNA",
      "It makes proteins",
      "It produces sunlight",
    ],
    answer: "It controls what enters and leaves the cell",
    concept: "Cell membrane",
    difficulty: "Easy",
  },
  {
    question: "What organelle produces ATP for the cell?",
    options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"],
    answer: "Mitochondria",
    concept: "Cell organelles",
    difficulty: "Easy",
  },
  {
    question: "What is osmosis?",
    options: [
      "Movement of water across a selectively permeable membrane",
      "Production of proteins",
      "Movement of DNA into the nucleus",
      "Production of ATP",
    ],
    answer: "Movement of water across a selectively permeable membrane",
    concept: "Osmosis",
    difficulty: "Medium",
  },
  {
    question: "What happens to an animal cell in a hypertonic solution?",
    options: [
      "It loses water and shrinks",
      "It gains water and bursts",
      "Nothing happens",
      "It starts photosynthesis",
    ],
    answer: "It loses water and shrinks",
    concept: "Osmosis",
    difficulty: "Medium",
  },
  {
    question: "Which process requires energy to move substances against their concentration gradient?",
    options: ["Diffusion", "Osmosis", "Active transport", "Passive transport"],
    answer: "Active transport",
    concept: "Cell transport",
    difficulty: "Hard",
  },
];

const STOP_WORDS = new Set([
  "this",
  "that",
  "with",
  "from",
  "they",
  "their",
  "there",
  "which",
  "where",
  "when",
  "what",
  "about",
  "these",
  "those",
  "into",
  "than",
  "then",
  "have",
  "will",
  "would",
  "could",
  "should",
  "because",
  "while",
  "during",
  "after",
  "before",
  "also",
  "only",
  "very",
  "more",
  "most",
  "some",
  "such",
  "used",
  "using",
  "each",
  "both",
  "other",
  "another",
  "being",
  "been",
  "were",
  "was",
  "are",
  "is",
  "the",
  "and",
  "for",
  "not",
  "but",
  "you",
  "your",
  "its",
  "how",
  "why",
  "can",
  "may",
  "has",
  "had",
  "does",
  "did",
  "john",
  "wiley",
  "sons",
  "inc",
  "corp",
  "press",
  "copyright",
  "reserved",
  "rights",
  "isbn",
  "page",
  "chapter",
  "edition",
  "volume",
  "author",
  "publisher",
  "registered",
  "trademark",
  "table",
  "contents",
  "published",
  "printed",
  "library",
  "congress",
  "cataloging",
  "publication",
]);

export function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, " ");
}

export function isNoiseLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (
    lower.includes("copyright") ||
    lower.includes("wiley") ||
    lower.includes("rights reserved") ||
    lower.includes("all rights") ||
    lower.includes("isbn") ||
    lower.includes("john ") ||
    lower.includes("printed in") ||
    lower.includes("library of congress") ||
    lower.includes("cataloging-in-publication") ||
    /^\s*chapter\s+\d+/i.test(line) ||
    /^\s*page\s+\d+/i.test(line) ||
    /^\d+\s*$/.test(line)
  ) {
    return true;
  }
  return false;
}

export function splitMaterial(materials: string): string[] {
  return materials
    .split(/\n+|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 25 && !isNoiseLine(line));
}

export function getKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 4 &&
        !STOP_WORDS.has(word) &&
        !/^\d+$/.test(word) &&
        !["john", "wiley", "sons", "inc", "copyright", "reserved", "rights", "isbn"].includes(word),
    );

  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 30);
}

function pickKeyword(sentence: string, allKeywords: string[]): string {
  const sentenceWords = new Set(
    sentence
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/),
  );

  return (
    allKeywords.find((keyword) => sentenceWords.has(keyword)) ??
    allKeywords[0] ??
    "concept"
  );
}

export function getConceptForSentence(sentence: string, defaultKeyword: string): string {
  const lower = sentence.toLowerCase();
  if (lower.includes("nucleus") || lower.includes("dna") || lower.includes("control center")) {
    return "Nucleus";
  }
  if (lower.includes("mitochondria") || lower.includes("atp") || lower.includes("energy")) {
    return "Mitochondria";
  }
  if (lower.includes("membrane") || lower.includes("enters and leaves") || lower.includes("permeable")) {
    return "Cell Membrane";
  }
  if (lower.includes("cell wall") || lower.includes("rigidity") || lower.includes("plant cell")) {
    return "Cell Wall";
  }
  if (lower.includes("chloroplast") || lower.includes("photosynthesis") || lower.includes("sunlight")) {
    return "Chloroplasts";
  }
  if (lower.includes("osmosis") || lower.includes("hypertonic") || lower.includes("hypotonic")) {
    return "Osmosis";
  }
  if (lower.includes("organelle")) {
    return "Cell Organelles";
  }

  const cleaned = defaultKeyword.replace(/[^\w]/g, "").trim();
  if (!cleaned || cleaned.toLowerCase() === "john" || cleaned.toLowerCase() === "wiley") {
    return "Cell Structure";
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function getCellsPresetQuizQuestions(subject: string): QuizQuestion[] {
  return [
    {
      id: "cells-preset-1",
      type: "multiple-choice",
      question: `Which organelle acts as the control center of the cell and houses DNA in ${subject}?`,
      options: ["Nucleus", "Mitochondria", "Cell membrane", "Ribosome"],
      answer: "Nucleus",
      concept: "Nucleus",
      difficulty: "Easy",
      sourceText: "The nucleus controls cell activities and contains the genetic material (DNA)."
    },
    {
      id: "cells-preset-2",
      type: "multiple-choice",
      question: "Which organelle is responsible for generating ATP energy through cellular respiration?",
      options: ["Mitochondria", "Nucleus", "Chloroplast", "Golgi apparatus"],
      answer: "Mitochondria",
      concept: "Mitochondria",
      difficulty: "Easy",
      sourceText: "Mitochondria produce ATP energy for cellular functions."
    },
    {
      id: "cells-preset-3",
      type: "true-false",
      question: "True or False: The cell membrane is selectively permeable, controlling what enters and leaves the cell.",
      answer: "True",
      concept: "Cell Membrane",
      difficulty: "Easy",
      sourceText: "The cell membrane regulates the entry and exit of molecules to maintain homeostasis."
    },
    {
      id: "cells-preset-4",
      type: "multiple-choice",
      question: "Which structure is found in plant cells but absent in animal cells?",
      options: ["Cell wall", "Mitochondria", "Cell membrane", "Ribosome"],
      answer: "Cell wall",
      concept: "Cell Wall",
      difficulty: "Medium",
      sourceText: "Plant cells have a rigid cell wall and chloroplasts which animal cells lack."
    },
    {
      id: "cells-preset-5",
      type: "fill-blank",
      question: "Plant cells carry out photosynthesis using green organelles called _____.",
      answer: "chloroplasts",
      concept: "Chloroplasts",
      difficulty: "Medium",
      sourceText: "Chloroplasts contain chlorophyll and convert sunlight into chemical energy via photosynthesis."
    }
  ];
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function makeWrongOptions(
  correct: string,
  keywords: string[],
  sentence: string,
): string[] {
  const noiseList = new Set(["john", "wiley", "sons", "inc", "copyright", "reserved", "rights", "isbn"]);
  const alternatives = keywords
    .filter((word) => normalize(word) !== normalize(correct))
    .filter((word) => !sentence.toLowerCase().includes(word))
    .filter((word) => !noiseList.has(word.toLowerCase()))
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .slice(0, 8);

  const padded = [...alternatives];
  const fallbackConcepts = ["Nucleus", "Mitochondria", "Cell Membrane", "Cell Wall", "Chloroplasts"];

  for (const fb of fallbackConcepts) {
    if (padded.length < 3 && fb !== correct && !padded.includes(fb)) {
      padded.push(fb);
    }
  }

  while (padded.length < 3) {
    padded.push(`Organelle function`);
  }

  return shuffle([correct, ...padded.slice(0, 3)]);
}

export function createQuestions(subject: string, materials: string): QuizQuestion[] {
  const sentences = splitMaterial(materials);

  if (sentences.length === 0) {
    return getCellsPresetQuizQuestions(subject);
  }

  const keywords = getKeywords(materials);
  const output: QuizQuestion[] = [];

  const sourceSentences = shuffle(sentences);

  sourceSentences.forEach((sentence, index) => {
    const keyword = pickKeyword(sentence, keywords);
    const concept = getConceptForSentence(sentence, keyword);

    const sentenceWithoutKeyword = sentence.replace(
      new RegExp(`\\b${keyword}\\b`, "i"),
      "_____",
    );

    // 1. Fill in the blank
    output.push({
      id: `fill-${index}-${keyword}`,
      type: "fill-blank",
      question: `Complete the statement from your ${subject} materials: ${sentenceWithoutKeyword}`,
      answer: keyword,
      concept: concept,
      difficulty: "Easy",
      sourceText: sentence,
    });

    // 2. True / False
    const isLongSentence = sentence.length > 80;

    output.push({
      id: `tf-${index}-${keyword}`,
      type: "true-false",
      question: `True or False: According to your materials, ${sentence}`,
      answer: "True",
      concept: concept,
      difficulty: isLongSentence ? "Medium" : "Easy",
      sourceText: sentence,
    });

    // 3. Multiple choice
    const options = makeWrongOptions(keyword, keywords, sentence);

    output.push({
      id: `mc-${index}-${keyword}`,
      type: "multiple-choice",
      question: `Which concept is being described in this part of your ${subject} materials?\n\n"${sentence}"`,
      options,
      answer: keyword,
      concept: concept,
      difficulty: "Medium",
      sourceText: sentence,
    });

    // 4. Short answer
    output.push({
      id: `short-${index}-${keyword}`,
      type: "short-answer",
      question: `In your own words, explain what this statement means:\n\n"${sentence}"`,
      answer: sentence,
      concept: concept,
      difficulty: "Hard",
      sourceText: sentence,
    });
  });

  if (output.length === 0) {
    return getCellsPresetQuizQuestions(subject);
  }

  return shuffle(output);
}

export function answerMatches(question: QuizQuestion, userAnswer: string): boolean {
  const user = normalize(userAnswer);

  if (!user) {
    return false;
  }

  if (question.type === "true-false") {
    return user === normalize(question.answer);
  }

  if (question.type === "fill-blank") {
    return (
      user === normalize(question.answer) ||
      user.includes(normalize(question.answer))
    );
  }

  if (question.type === "multiple-choice") {
    return user === normalize(question.answer);
  }

  const importantWords = getKeywords(question.answer).slice(0, 3);

  if (importantWords.length === 0) {
    return user.length >= 15;
  }

  const matches = importantWords.filter((word) =>
    user.includes(word),
  ).length;

  return matches >= Math.ceil(importantWords.length / 2);
}

export function cleanMaterialsText(rawText: string): string {
  if (!rawText) return "";
  const lines = rawText.split(/\r?\n/);
  return lines
    .map((l) => l.trim())
    .filter((l) => l.length >= 6 && !isNoiseLine(l))
    .join("\n");
}

export type CleanLearningContext = {
  lessonTitle: string;
  discipline: string;
  rawMaterialsCount: number;
  hasUploadedMaterials: boolean;
  cleanedText: string;
  cleanSentences: string[];
  concepts: string[];
};

export function getCleanLessonLearningContext(
  lessonTitle: string,
  discipline: string,
  materialsList: { content: string | null; title: string; kind: string }[] = [],
  topicText?: string,
): CleanLearningContext {
  const textPieces = materialsList
    .map((m) => m.content)
    .filter((c): c is string => typeof c === "string" && c.trim().length > 0);

  const rawMaterialsCount = materialsList.length;
  const hasUploadedMaterials = textPieces.length > 0;

  const rawCombined = [...textPieces, topicText ?? ""].filter(Boolean).join("\n\n");
  const cleanedText = cleanMaterialsText(rawCombined);
  const cleanSentences = splitMaterial(cleanedText);

  const rawKeywords = getKeywords(cleanedText);
  const conceptsMap = new Map<string, string>();

  for (const sentence of cleanSentences) {
    const kw = pickKeyword(sentence, rawKeywords);
    const concept = getConceptForSentence(sentence, kw);
    const lower = concept.toLowerCase();
    if (!["john", "wiley", "sons", "inc", "copyright", "reserved", "isbn", "page", "chapter", "publisher"].includes(lower)) {
      conceptsMap.set(lower, concept);
    }
  }

  const concepts = Array.from(conceptsMap.values());
  if (concepts.length === 0) {
    concepts.push("Nucleus", "Mitochondria", "Cell Membrane", "Cell Wall", "Chloroplasts");
  }

  return {
    lessonTitle,
    discipline,
    rawMaterialsCount,
    hasUploadedMaterials,
    cleanedText,
    cleanSentences,
    concepts,
  };
}

/** Local practice generator for offline/API-free practice sessions */
export function generateLocalPracticeActivity(
  lessonTitle: string,
  materialsText?: string,
  avoidPrompts: string[] = [],
) {
  const cleaned = materialsText ? cleanMaterialsText(materialsText) : "";
  if (cleaned && cleaned.trim().length > 30) {
    const questions = createQuestions(lessonTitle, cleaned);
    if (questions.length > 0) {
      const filtered = questions.filter(
        (q) => !avoidPrompts.some((avoid) => avoid.toLowerCase().includes(q.question.slice(0, 30).toLowerCase())),
      );
      const pool = filtered.length > 0 ? filtered : questions;
      const q = pool[Math.floor(Math.random() * pool.length)]!;
      return {
        prompt: q.question,
        hints: [
          `Focus on the core idea of ${q.concept}.`,
          `Reference source text: "${q.sourceText.slice(0, 60)}..."`,
          `Key concept: ${q.concept}`,
        ],
        concepts: [q.concept, lessonTitle],
      };
    }
  }

  // Fallback to Day 3 practice question deck item
  const avoidSet = new Set(avoidPrompts.map((a) => a.toLowerCase()));
  const filteredPresets = DAY3_PRACTICE_QUESTIONS.filter(
    (p) => !avoidSet.has(p.question.toLowerCase()),
  );
  const pool = filteredPresets.length > 0 ? filteredPresets : DAY3_PRACTICE_QUESTIONS;
  const preset = pool[Math.floor(Math.random() * pool.length)]!;
  return {
    prompt: `${preset.question} (Concept: ${preset.concept})`,
    hints: [
      `Think about the role of ${preset.concept}.`,
      `Consider how options relate to ${lessonTitle}.`,
      `Correct answer concept involves: ${preset.answer}.`,
    ],
    concepts: [preset.concept, lessonTitle],
  };
}
