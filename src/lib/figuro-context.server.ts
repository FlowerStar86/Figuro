// Builds the study context the tutor is allowed to see for one lesson:
// the lesson itself, the folder path it lives in, and the learner's own materials.
// Server-only: it runs with the caller's authenticated client, so RLS keeps
// every learner inside their own data.

import type { SupabaseClient } from "@supabase/supabase-js";

export type OtherLessonSummary = {
  id: string;
  title: string;
  discipline: string;
  summaryText: string;
};

export type LessonContext = {
  lessonTitle: string;
  discipline: string;
  /** e.g. "Math / Unit 1 / Quadratic Equations" */
  locationPath: string;
  /** Readable material text, already trimmed to a safe size. */
  materialsText: string;
  /** Materials that exist but whose text Figuro could not read. */
  unreadable: string[];
  hasReadableMaterials: boolean;
  /** Summary of learner's other available lessons and notes for cross-lesson queries */
  otherLessons?: OtherLessonSummary[];
};

const MAX_TOTAL = 18000;
const MAX_PER_MATERIAL = 6000;

type AnyClient = SupabaseClient<any, any, any>;

export async function loadLessonContext(
  supabase: AnyClient,
  lessonId: string | null | undefined,
  fallbackTitle: string,
  fallbackDiscipline: string,
): Promise<LessonContext> {
  const empty: LessonContext = {
    lessonTitle: fallbackTitle,
    discipline: fallbackDiscipline,
    locationPath: fallbackTitle,
    materialsText: "",
    unreadable: [],
    hasReadableMaterials: false,
    otherLessons: [],
  };
  if (!lessonId) return empty;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, discipline, folder_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return empty;

  // Walk up the folder chain (Lesson -> Unit -> Subject).
  const { data: folders } = await supabase.from("folders").select("id, name, parent_id");
  const all = (folders ?? []) as { id: string; name: string; parent_id: string | null }[];
  const chain: { id: string; name: string }[] = [];
  let cursor = all.find((f) => f.id === lesson.folder_id);
  const guard = new Set<string>();
  while (cursor && !guard.has(cursor.id)) {
    guard.add(cursor.id);
    chain.unshift({ id: cursor.id, name: cursor.name });
    cursor = all.find((f) => f.id === cursor!.parent_id);
  }

  const folderIds = chain.map((f) => f.id);

  // Lesson materials first, then materials attached to the folders above it.
  const { data: lessonMaterials } = await supabase
    .from("materials")
    .select("title, kind, content, url, extracted, lesson_id, folder_id")
    .eq("lesson_id", lessonId);

  let folderMaterials: any[] = [];
  if (folderIds.length) {
    const { data } = await supabase
      .from("materials")
      .select("title, kind, content, url, extracted, lesson_id, folder_id")
      .in("folder_id", folderIds)
      .is("lesson_id", null);
    folderMaterials = data ?? [];
  }

  const rows = [...(lessonMaterials ?? []), ...folderMaterials];

  const parts: string[] = [];
  const unreadable: string[] = [];
  let used = 0;

  for (const m of rows) {
    const scope = m.lesson_id ? "this lesson" : "this unit/subject";
    if (m.kind === "link" || m.kind === "video") {
      parts.push(`[${m.title}] (${m.kind} the student saved for ${scope}): ${m.url ?? ""}\n${m.content ?? ""}`.trim());
      continue;
    }
    const text = typeof m.content === "string" ? m.content.trim() : "";
    if (!text) {
      unreadable.push(m.title);
      continue;
    }
    const slice = text.slice(0, MAX_PER_MATERIAL);
    if (used + slice.length > MAX_TOTAL) break;
    used += slice.length;
    parts.push(`--- MATERIAL: ${m.title} (${m.kind}, attached to ${scope}) ---\n${slice}`);
  }

  // Load other lessons context for cross-lesson queries
  const { data: userOtherLessons } = await supabase
    .from("lessons")
    .select("id, title, discipline")
    .neq("id", lessonId)
    .limit(10);

  const otherLessons: OtherLessonSummary[] = [];
  if (userOtherLessons && userOtherLessons.length > 0) {
    for (const ol of userOtherLessons) {
      const { data: olMats } = await supabase
        .from("materials")
        .select("title, content")
        .eq("lesson_id", ol.id)
        .limit(3);

      const matTexts = (olMats ?? [])
        .map((m) => `${m.title}: ${m.content ?? ""}`)
        .join("; ");

      otherLessons.push({
        id: ol.id,
        title: ol.title,
        discipline: ol.discipline,
        summaryText: matTexts.slice(0, 1000) || `${ol.title} (${ol.discipline})`,
      });
    }
  }

  const locationPath = [...chain.map((f) => f.name), lesson.title].join(" / ");

  return {
    lessonTitle: lesson.title,
    discipline: lesson.discipline,
    locationPath,
    materialsText: parts.join("\n\n"),
    unreadable,
    hasReadableMaterials: parts.length > 0,
    otherLessons,
  };
}
