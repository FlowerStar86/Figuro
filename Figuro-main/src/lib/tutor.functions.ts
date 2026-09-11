import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callTutor, generatePracticeActivity, gradeAttempt } from "./tutor.server";

const sourceMode = z.enum(["materials", "web"]).default("materials");

const tutorInput = z.object({
  lessonId: z.string().nullable().optional(),
  lessonTitle: z.string().min(1).max(120),
  discipline: z.string().min(1).max(80),
  sourceMode,
  mode: z.enum([
    "explain",
    "simpler",
    "example",
    "check",
    "chat",
    "visual",
    "interactive",
    "video",
    "solve",
    "audio",
    "next",
  ]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .max(30),
});

const practiceInput = z.object({
  lessonId: z.string().nullable().optional(),
  lessonTitle: z.string().min(1).max(120),
  discipline: z.string().min(1).max(80),
  avoid: z.array(z.string().max(1000)).max(6).optional(),
});

const gradeInput = z.object({
  lessonId: z.string().nullable().optional(),
  lessonTitle: z.string().min(1).max(120),
  discipline: z.string().min(1).max(80),
  activityPrompt: z.string().min(1).max(2000),
  attempt: z.string().min(1).max(6000),
  hintsUsed: z.number().int().min(0).max(10),
  attemptNumber: z.number().int().min(1).max(50),
});

function isSaveNoteRequest(text: string): boolean {
  const norm = text.toLowerCase();
  return (
    norm.includes("add this to my lesson") ||
    norm.includes("add this to my notes") ||
    norm.includes("save this to my lesson") ||
    norm.includes("save this to my notes") ||
    norm.includes("save this note") ||
    norm.includes("add to notes") ||
    norm.includes("add to my notes") ||
    norm.includes("remember this for this lesson") ||
    norm.includes("save to my notes") ||
    norm.includes("save note:") ||
    norm.includes("add note:")
  );
}

function extractNoteContent(text: string): string {
  let content = text
    .replace(/(?:please\s+)?(?:add|save|remember)\s+this(?:\s+to\s+my\s+(?:notes?|lesson))?(?:\s+for\s+this\s+lesson)?(?::|\s+that|\s+is)?/i, "")
    .replace(/save\s+note:/i, "")
    .replace(/add\s+note:/i, "")
    .trim();
  if (!content || content.length < 3) {
    content = text.trim();
  }
  return content;
}

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tutorInput.parse(data))
  .handler(async ({ data, context }) => {
    const { loadLessonContext } = await import("./figuro-context.server");
    const ctx = await loadLessonContext(
      context.supabase,
      data.lessonId ?? null,
      data.lessonTitle,
      data.discipline,
    );

    let savedNoteInfo: { id: string; title: string; content: string } | undefined;
    const lastUserMsg = data.messages.length > 0 ? data.messages[data.messages.length - 1]!.content : "";

    if (data.lessonId && isSaveNoteRequest(lastUserMsg)) {
      const noteText = extractNoteContent(lastUserMsg);
      const title = noteText.slice(0, 40).trim() || `Note for ${data.lessonTitle}`;
      const { data: inserted, error: insErr } = await context.supabase
        .from("materials")
        .insert({
          user_id: context.user?.id,
          lesson_id: data.lessonId,
          kind: "note",
          title,
          content: noteText,
          extracted: true,
        })
        .select()
        .single();

      if (inserted && !insErr) {
        savedNoteInfo = {
          id: inserted.id as string,
          title: inserted.title as string,
          content: (inserted.content as string) ?? noteText,
        };
      }
    }

    const res = await callTutor({
      lessonTitle: ctx.lessonTitle,
      discipline: ctx.discipline,
      mode: data.mode,
      messages: data.messages,
      ctx,
      sourceMode: data.sourceMode,
      savedNoteInfo,
    });

    return {
      ...res,
      savedNote: savedNoteInfo,
    };
  });

export const getPracticeActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => practiceInput.parse(data))
  .handler(async ({ data, context }) => {
    const { loadLessonContext } = await import("./figuro-context.server");
    const ctx = await loadLessonContext(
      context.supabase,
      data.lessonId ?? null,
      data.lessonTitle,
      data.discipline,
    );
    return generatePracticeActivity({
      lessonTitle: ctx.lessonTitle,
      discipline: ctx.discipline,
      avoid: data.avoid,
      ctx,
    });
  });

export const reviewAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => gradeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { loadLessonContext } = await import("./figuro-context.server");
    const ctx = await loadLessonContext(
      context.supabase,
      data.lessonId ?? null,
      data.lessonTitle,
      data.discipline,
    );
    return gradeAttempt({
      lessonTitle: ctx.lessonTitle,
      discipline: ctx.discipline,
      activityPrompt: data.activityPrompt,
      attempt: data.attempt,
      hintsUsed: data.hintsUsed,
      attemptNumber: data.attemptNumber,
      ctx,
    });
  });
