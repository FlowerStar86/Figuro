// Lesson + folder model. Everything here belongs to one signed-in learner.

import type { Topic } from "./figuro-data";

export type LessonAccent =
  | "feature-tutor"
  | "feature-weakpoint"
  | "feature-practice"
  | "feature-guided"
  | "feature-adaptive"
  | "feature-flashcards"
  | "feature-agents";

export const ACCENTS: LessonAccent[] = [
  "feature-tutor",
  "feature-weakpoint",
  "feature-practice",
  "feature-guided",
  "feature-adaptive",
  "feature-flashcards",
  "feature-agents",
];

export type Lesson = {
  id: string;
  title: string;
  discipline: string;
  folderId: string | null;
  /** 0-100 */
  progress: number;
  lastActivity: string;
  accent: LessonAccent;
};

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
};

export type MaterialKind = "note" | "text" | "link" | "video" | "flashcards" | "file";

export type Material = {
  id: string;
  lessonId: string | null;
  folderId: string | null;
  kind: MaterialKind;
  title: string;
  content: string | null;
  url: string | null;
  storagePath: string | null;
  mimeType: string | null;
  /** True when Figuro could read the text of this material. */
  extracted: boolean;
  createdAt: string;
};

export const MATERIAL_LABEL: Record<MaterialKind, string> = {
  note: "Note",
  text: "Pasted text",
  link: "Link",
  video: "Video",
  flashcards: "Flashcards",
  file: "File",
};

/** How the tutor is allowed to source answers. */
export type SourceMode = "materials" | "web";

export function findLesson(lessons: Lesson[], id: string | null | undefined): Lesson | null {
  return lessons.find((l) => l.id === id) ?? lessons[0] ?? null;
}

export function accentFor(seed: string): LessonAccent {
  let n = 0;
  for (const ch of seed) n = (n + ch.charCodeAt(0)) % 997;
  return ACCENTS[n % ACCENTS.length]!;
}

/** Path of folder names from subject down to the folder itself. */
export function folderPath(folders: Folder[], folderId: string | null | undefined): Folder[] {
  const out: Folder[] = [];
  let current = folders.find((f) => f.id === folderId);
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    out.unshift(current);
    current = folders.find((f) => f.id === current!.parentId);
  }
  return out;
}

export function childFolders(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((f) => f.parentId === parentId);
}

/**
 * Scaffold content shown on Learn/Practice for a lesson.
 * Real substance comes from the tutor and the learner's own materials.
 */
export function lessonContent(lesson: Lesson): Topic {
  const normTitle = (lesson.title + " " + lesson.discipline).toLowerCase();

  if (normTitle.includes("cell") || normTitle.includes("biolog")) {
    return {
      slug: lesson.id,
      title: lesson.title,
      discipline: lesson.discipline,
      summary: `Understand how cells function as the basic units of life, including key organelles, energy production, and plant vs. animal cells.`,
      explanation: [
        `Learn how the nucleus controls cell activities and stores DNA instructions.`,
        `Explore how mitochondria generate ATP energy and how the cell membrane regulates entry and exit through selective permeability.`,
      ],
      examples: [
        { label: "Try asking", body: `"Explain cells from the start."` },
        { label: "Or", body: `"Why do plant cells have chloroplasts and a cell wall?"` },
      ],
      checkpoints: [
        `What is the main job of the nucleus, and what genetic material does it contain?`,
        `How do mitochondria generate ATP energy for cellular processes?`,
        `What does the cell membrane control, and why is selective permeability essential?`,
        `Name two structures found in plant cells but NOT in animal cells and state their roles.`,
      ],
      practice: {
        prompt: `Explain how the nucleus, mitochondria, and cell membrane work together to keep a cell alive, and contrast plant cells with animal cells.`,
        starter: "",
        hints: [
          "Start with the nucleus as the control center containing DNA instructions.",
          "Explain how mitochondria convert energy into ATP to power cell activities.",
          "Describe how the cell membrane selectively regulates what enters and leaves.",
        ],
      },
    };
  }

  return {
    slug: lesson.id,
    title: lesson.title,
    discipline: lesson.discipline,
    summary: `Build a working understanding of ${lesson.title}.`,
    explanation: [
      `Ask the tutor anything about ${lesson.title} and it will explain key concepts step by step.`,
      `Add your own slides, notes, or readings to this lesson to study directly from your materials.`,
    ],
    examples: [
      { label: "Try asking", body: `"Explain ${lesson.title} from the start."` },
      { label: "Or", body: `"Give me a practical example of ${lesson.title}."` },
    ],
    checkpoints: [
      `What is the fundamental rule or concept governing ${lesson.title}?`,
      `How do the key components of ${lesson.title} interact with each other?`,
      `Describe a real-world scenario where ${lesson.title} is applied.`,
    ],
    practice: {
      prompt: `In your own words, explain the core principles of ${lesson.title} and work through one scenario step by step.`,
      starter: "",
      hints: [
        "Start by defining the main concepts clearly.",
        "Break the topic down into core mechanisms.",
        "Describe a concrete example to illustrate your explanation.",
      ],
    },
  };
}
