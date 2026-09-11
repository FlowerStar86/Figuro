// All Figuro data access. Every row is scoped to the signed-in learner by RLS.

import { supabase } from "@/integrations/supabase/client";
import type { ActivityEvent, LearningMethod } from "./figuro-activity";
import {
  accentFor,
  type Folder,
  type Lesson,
  type LessonAccent,
  type Material,
  type MaterialKind,
} from "./figuro-lessons";
import type { PracticeActivity } from "./tutor.server";

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const strOrNull = (v: unknown) => (typeof v === "string" ? v : null);
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

function toLesson(r: Row): Lesson {
  const rawProgress = typeof r["progress"] === "number" ? r["progress"] : 0;
  return {
    id: str(r["id"]),
    title: str(r["title"]),
    discipline: str(r["discipline"], "Custom topic"),
    folderId: strOrNull(r["folder_id"]),
    progress: Math.min(100, Math.max(0, Math.round(rawProgress))),
    lastActivity: str(r["last_activity"], "Not started yet"),
    accent: (str(r["accent"], "feature-tutor") as LessonAccent) ?? "feature-tutor",
  };
}

function toFolder(r: Row): Folder {
  return { id: str(r["id"]), name: str(r["name"]), parentId: strOrNull(r["parent_id"]) };
}

function toMaterial(r: Row): Material {
  return {
    id: str(r["id"]),
    lessonId: strOrNull(r["lesson_id"]),
    folderId: strOrNull(r["folder_id"]),
    kind: str(r["kind"], "note") as MaterialKind,
    title: str(r["title"]),
    content: strOrNull(r["content"]),
    url: strOrNull(r["url"]),
    storagePath: strOrNull(r["storage_path"]),
    mimeType: strOrNull(r["mime_type"]),
    extracted: r["extracted"] === true,
    createdAt: str(r["created_at"]),
  };
}

function toEvent(r: Row): ActivityEvent {
  const created = str(r["created_at"]);
  return {
    id: str(r["id"]),
    lessonId: str(r["lesson_id"]),
    at: created ? new Date(created).getTime() : Date.now(),
    kind: str(r["kind"], "tutor_question") as ActivityEvent["kind"],
    label: str(r["label"]),
    ...(typeof r["score"] === "number" ? { score: r["score"] as number } : {}),
    weakConcepts: strArray(r["weak_concepts"]),
    strongConcepts: strArray(r["strong_concepts"]),
    ...(typeof r["method"] === "string" ? { method: r["method"] as LearningMethod } : {}),
    ...(typeof r["helped"] === "boolean" ? { helped: r["helped"] as boolean } : {}),
  };
}

export type FiguroData = {
  folders: Folder[];
  lessons: Lesson[];
  materials: Material[];
  events: ActivityEvent[];
  practice: Record<string, PracticeActivity>;
};

export async function loadAll(userId: string): Promise<FiguroData> {
  const [folders, lessons, materials, events, practice] = await Promise.all([
    supabase.from("folders").select("*").order("created_at"),
    supabase.from("lessons").select("*").order("created_at", { ascending: false }),
    supabase.from("materials").select("*").order("created_at", { ascending: false }),
    supabase.from("activity_events").select("*").order("created_at").limit(500),
    supabase.from("practice_activities").select("*"),
  ]);
  void userId;

  const practiceMap: Record<string, PracticeActivity> = {};
  for (const r of (practice.data ?? []) as Row[]) {
    practiceMap[str(r["lesson_id"])] = {
      prompt: str(r["prompt"]),
      hints: strArray(r["hints"]),
      concepts: strArray(r["concepts"]),
    };
  }

  return {
    folders: ((folders.data ?? []) as Row[]).map(toFolder),
    lessons: ((lessons.data ?? []) as Row[]).map(toLesson),
    materials: ((materials.data ?? []) as Row[]).map(toMaterial),
    events: ((events.data ?? []) as Row[]).map(toEvent),
    practice: practiceMap,
  };
}

/* ---------------- folders ---------------- */

export async function insertFolder(
  userId: string,
  name: string,
  parentId: string | null,
): Promise<Folder | null> {
  const { data } = await supabase
    .from("folders")
    .insert({ user_id: userId, name: name.trim(), parent_id: parentId })
    .select()
    .single();
  return data ? toFolder(data as Row) : null;
}

export async function renameFolderRow(id: string, name: string) {
  await supabase.from("folders").update({ name: name.trim() }).eq("id", id);
}

export async function deleteFolderRow(id: string) {
  await supabase.from("folders").delete().eq("id", id);
}

/* ---------------- lessons ---------------- */

export async function insertLesson(
  userId: string,
  title: string,
  discipline?: string | null,
  folderId?: string | null,
): Promise<Lesson | null> {
  const disc = typeof discipline === "string" && discipline.trim() ? discipline.trim() : "Custom topic";
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      user_id: userId,
      title: title.trim(),
      discipline: disc,
      folder_id: folderId ?? null,
      accent: accentFor(title),
    })
    .select()
    .single();
  if (error) {
    console.error("Failed to insert lesson into Supabase:", error);
    throw new Error(error.message);
  }
  return data ? toLesson(data as Row) : null;
}

export async function updateLessonRow(
  id: string,
  patch: { title?: string; discipline?: string; folder_id?: string | null; progress?: number; last_activity?: string },
) {
  await supabase.from("lessons").update(patch).eq("id", id);
}

export async function deleteLessonRow(id: string) {
  await supabase.from("lessons").delete().eq("id", id);
}

/* ---------------- materials ---------------- */

export type NewMaterial = {
  kind: MaterialKind;
  title: string;
  content?: string | null;
  url?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  extracted?: boolean;
  lessonId?: string | null;
  folderId?: string | null;
};

export async function insertMaterial(userId: string, m: NewMaterial): Promise<Material | null> {
  const { data, error } = await supabase
    .from("materials")
    .insert({
      user_id: userId,
      kind: m.kind,
      title: m.title.trim() || "Untitled",
      content: m.content ?? null,
      url: m.url ?? null,
      storage_path: m.storagePath ?? null,
      mime_type: m.mimeType ?? null,
      extracted: m.extracted ?? false,
      lesson_id: m.lessonId ?? null,
      folder_id: m.folderId ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data ? toMaterial(data as Row) : null;
}

export async function deleteMaterialRow(material: Material) {
  if (material.storagePath) {
    await supabase.storage.from("materials").remove([material.storagePath]);
  }
  await supabase.from("materials").delete().eq("id", material.id);
}

export async function uploadMaterialFile(userId: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);
  const path = `${userId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("materials").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedMaterialUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("materials").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

/* ---------------- activity ---------------- */

export async function insertEvent(
  userId: string,
  e: Omit<ActivityEvent, "id" | "at">,
): Promise<ActivityEvent | null> {
  const { data } = await supabase
    .from("activity_events")
    .insert({
      user_id: userId,
      lesson_id: e.lessonId,
      kind: e.kind,
      label: e.label,
      score: e.score ?? null,
      weak_concepts: e.weakConcepts ?? [],
      strong_concepts: e.strongConcepts ?? [],
      method: e.method ?? null,
      helped: e.helped ?? null,
    })
    .select()
    .single();
  return data ? toEvent(data as Row) : null;
}

/* ---------------- practice ---------------- */

export async function upsertPractice(userId: string, lessonId: string, a: PracticeActivity) {
  await supabase.from("practice_activities").upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      prompt: a.prompt,
      hints: a.hints,
      concepts: a.concepts,
    },
    { onConflict: "user_id,lesson_id" },
  );
}
