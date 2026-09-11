import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Page, PageHeading, Panel } from "@/components/figuro/section";
import { LessonBar } from "@/components/figuro/lesson-bar";
import { TutorText } from "@/components/figuro/tutor-text";
import { useFiguroSession } from "@/lib/figuro-session";
import { askTutor } from "@/lib/tutor.functions";
import type { TutorMode } from "@/lib/tutor.server";
import type { ActivityKind, LearningMethod } from "@/lib/figuro-activity";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => ({
    meta: [
      { title: "Your personalized tutor — Figuro" },
      {
        name: "description",
        content:
          "Learn your topic with a personalized AI tutor that explains simply, uses examples, and asks questions instead of handing over answers.",
      },
      { property: "og:title", content: "Your personalized tutor — Figuro" },
      {
        property: "og:description",
        content: "Simple explanations, examples, and understanding checks for the lesson you chose.",
      },
    ],
  }),
  component: LearnPage,
});

type Turn = { role: "user" | "assistant"; content: string };

/** Each preset sends a real message, so the tutor always has the same context a typed question gives it. */
const PRESETS: {
  label: string;
  mode: TutorMode;
  message: (title: string) => string;
  kind: ActivityKind;
  method: LearningMethod;
}[] = [
  {
    label: "Beginner Guide",
    mode: "simpler",
    message: (t) => `I am new to ${t}. Explain it simply from scratch without complicated jargon.`,
    kind: "tutor_explain",
    method: "reading",
  },
  {
    label: "I'm confused",
    mode: "simpler",
    message: () => "I'm confused — can you explain that again in a simpler way?",
    kind: "tutor_confused",
    method: "reading",
  },
  {
    label: "Audio Lesson",
    mode: "audio",
    message: (t) => `Give me an audio-friendly spoken lesson on ${t}.`,
    kind: "tutor_explain",
    method: "conversation",
  },
  {
    label: "Give me an example",
    mode: "example",
    message: (t) => `Give me a worked example for ${t}.`,
    kind: "tutor_question",
    method: "example",
  },
  {
    label: "Quiz my understanding",
    mode: "check",
    message: (t) => `Quiz me on ${t} to check what I've understood.`,
    kind: "tutor_check",
    method: "practice",
  },
];

/** Alternative ways in — offered after the learner signals confusion. */
const METHOD_OFFERS: { label: string; mode: TutorMode; method: LearningMethod }[] = [
  { label: "Show me a diagram", mode: "visual", method: "visual" },
  { label: "Listen to audio lesson", mode: "audio", method: "conversation" },
  { label: "Walk me through it step by step", mode: "interactive", method: "interactive" },
  { label: "Suggest a short video", mode: "video", method: "video" },
];

function LearnPage() {
  const {
    activeLesson,
    topic,
    lessons,
    selectLesson,
    updateProgress,
    record,
    sourceMode,
    setSourceMode,
    materialsFor,
    addMaterial,
    loading,
  } = useFiguroSession();
  const navigate = useNavigate();
  const tutor = useServerFn(askTutor);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethods, setShowMethods] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<LearningMethod | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Selecting a different lesson starts a fresh tutor session for that topic.
  useEffect(() => {
    setTurns([]);
    setError(null);
    setShowMethods(false);
    setPendingMethod(null);
  }, [activeLesson?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns.length, busy]);

  if (loading) return <LessonPlaceholder message="Loading your lessons…" />;
  if (!activeLesson || !topic) return <NoLessonYet />;
  const lesson = activeLesson;

  const materials = materialsFor(lesson.id);

  async function run(
    mode: TutorMode,
    userText: string,
    meta?: { kind?: ActivityKind; method?: LearningMethod },
  ) {
    if (busy) return;
    const history: Turn[] = [...turns, { role: "user", content: userText }];
    setTurns(history);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const result = await tutor({
        data: {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          discipline: lesson.discipline,
          sourceMode,
          mode,
          messages: history,
        },
      });
      if (result.error) {
        setError(result.error);
        setTurns(turns);
      } else {
        setTurns([...history, { role: "assistant", content: result.reply }]);
        if (result.savedNote) {
          void addMaterial({
            kind: "note",
            title: result.savedNote.title,
            content: result.savedNote.content,
            lessonId: lesson.id,
            extracted: true,
          });
        }
        record({
          lessonId: lesson.id,
          kind: meta?.kind ?? "tutor_question",
          label: userText.slice(0, 90),
          ...(meta?.method ? { method: meta.method } : {}),
        });
        if (meta?.method) setPendingMethod(meta.method);
        if (meta?.kind === "tutor_confused") setShowMethods(true);
        updateProgress(lesson.id, Math.min(100, Math.max(0, lesson.progress + 4)));
      }
    } catch {
      setError("Something went wrong reaching the tutor. Please try again.");
      setTurns(turns);
    } finally {
      setBusy(false);
    }
  }

  function rateMethod(helped: boolean) {
    if (!pendingMethod) return;
    record({
      lessonId: lesson.id,
      kind: "method_feedback",
      label: `${helped ? "Helped" : "Didn't help"}: ${pendingMethod}`,
      method: pendingMethod,
      helped,
    });
    setPendingMethod(null);
    if (!helped) setShowMethods(true);
  }

  const lastAssistantTurn =
    [...turns].reverse().find((t) => t.role === "assistant")?.content ?? "";

  const partMatch = lastAssistantTurn.match(/Part\s+(\d+)\s+of\s+(\d+)/i);
  const currentPartNum = partMatch ? parseInt(partMatch[1]!, 10) : 1;
  const totalPartsNum = partMatch ? parseInt(partMatch[2]!, 10) : 3;

  const isLastPart =
    (partMatch && currentPartNum >= totalPartsNum) ||
    (lastAssistantTurn.includes("All ") && lastAssistantTurn.includes("Parts Complete")) ||
    lastAssistantTurn.includes("Lesson Complete");

  function handleGoBack() {
    if (turns.length === 0 || currentPartNum <= 1) return;
    let targetIdx = -1;
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i];
      if (t.role === "assistant") {
        const match = t.content.match(/Part\s+(\d+)\s+of\s+(\d+)/i);
        if (match) {
          const pNum = parseInt(match[1]!, 10);
          if (pNum < currentPartNum) {
            targetIdx = i;
            break;
          }
        }
      }
    }

    if (targetIdx !== -1) {
      setTurns(turns.slice(0, targetIdx + 1));
    } else if (turns.length >= 2) {
      setTurns(turns.slice(0, -2));
    }
  }

  return (
    <Page>
      <PageHeading
        eyebrow="Learn"
        title={lesson.title}
        description="Your personalized tutor explains this lesson in plain language, gives examples, and checks that it landed — no answers handed over."
      />

      <LessonBar current="learn" />

      <div className="mb-6 flex flex-wrap gap-2">
        {lessons.slice(0, 5).map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => selectLesson(l.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ring-1 transition-colors ${
              l.id === lesson.id
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card ring-border hover:bg-surface"
            }`}
          >
            {l.title}
          </button>
        ))}
        <Link
          to="/lessons"
          className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground ring-1 ring-border transition-opacity hover:opacity-90"
        >
          + New lesson
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-border">
        <span className="text-xs tracking-widest text-muted-foreground uppercase">Sources</span>
        <div className="flex gap-1">
          {(
            [
              ["materials", "My materials only"],
              ["web", "My materials + web"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSourceMode(value)}
              aria-pressed={sourceMode === value}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
                sourceMode === value
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card ring-border hover:bg-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {materials.length
            ? `${materials.length} material${materials.length === 1 ? "" : "s"} for this lesson`
            : "No materials added yet"}
        </span>
        <Link to="/lessons" className="text-xs font-medium underline underline-offset-2">
          Manage materials
        </Link>
      </div>

      <Panel className="mb-4">
        <span
          className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase"
          style={{ color: "var(--feature-tutor)" }}
        >
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: "var(--feature-tutor)" }}
            aria-hidden
          />
          Personalized Tutor · {lesson.title}
        </span>

        {turns.length === 0 && !busy ? (
          <div className="space-y-4">
            {topic.explanation.map((para) => (
              <p key={para} className="text-base leading-relaxed text-pretty text-muted-foreground">
                {para}
              </p>
            ))}
            <button
              type="button"
              onClick={() =>
                void run("explain", `Explain ${lesson.title} to me from the start.`, {
                  kind: "tutor_explain",
                  method: "reading",
                })
              }
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-primary transition-opacity hover:opacity-90"
            >
              Explain {lesson.title}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {turns.map((t, i) => (
              <div key={i} className={t.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={
                    t.role === "user"
                      ? "max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground"
                      : "max-w-full rounded-2xl bg-surface px-4 py-3"
                  }
                >
                  {t.role === "assistant" ? (
                    <TutorText text={t.content} removeEmojis />
                  ) : (
                    <p className="text-base leading-relaxed whitespace-pre-wrap text-pretty">
                      {t.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <p className="text-sm text-muted-foreground" role="status">
                Tutor is thinking...
              </p>
            )}
            <div ref={endRef} />
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl px-4 py-3 text-sm text-destructive ring-1 ring-destructive/30">
            {error}
          </p>
        )}

        {pendingMethod && !busy && turns.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-surface px-4 py-3">
            <span className="text-sm text-muted-foreground">Did that way of explaining help?</span>
            <button
              type="button"
              onClick={() => rateMethod(true)}
              className="rounded-full bg-card px-3 py-1 text-xs font-medium ring-1 ring-border hover:bg-secondary"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => rateMethod(false)}
              className="rounded-full bg-card px-3 py-1 text-xs font-medium ring-1 ring-border hover:bg-secondary"
            >
              Not really
            </button>
          </div>
        )}

        {showMethods && (
          <div className="mt-4 rounded-xl bg-surface px-4 py-3">
            <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
              Try another way in
            </p>
            <div className="flex flex-wrap gap-2">
              {METHOD_OFFERS.map((m) => (
                <TutorChip
                  key={m.label}
                  label={m.label}
                  disabled={busy}
                  onClick={() =>
                    void run(m.mode, `${m.label} for ${lesson.title}.`, {
                      kind: "tutor_question",
                      method: m.method,
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim())
              void run("chat", draft.trim(), { kind: "tutor_question", method: "conversation" });
          }}
          className="mt-5 flex flex-wrap gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Type your answer or ask about ${lesson.title}...`}
            aria-label="Ask your tutor"
            className="flex-1 min-w-[200px] rounded-xl bg-surface px-4 py-3 text-base ring-1 ring-border outline-none focus:ring-primary"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground ring-1 ring-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Check Answer
          </button>
          <button
            type="button"
            disabled={busy || currentPartNum <= 1 || turns.length === 0}
            onClick={handleGoBack}
            className="rounded-xl bg-card px-4 py-3 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-secondary disabled:opacity-40"
          >
            Go Back
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDraft("");
              void run("next", isLastPart ? "Finish Lesson" : "Next Part", {
                kind: "tutor_question",
                method: "conversation",
              });
            }}
            className="rounded-xl bg-card px-4 py-3 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-secondary disabled:opacity-40"
          >
            {isLastPart ? "Finish Lesson" : "Next Part"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <TutorChip
              key={p.label}
              label={p.label}
              disabled={busy}
              onClick={() =>
                void run(p.mode, p.message(lesson.title), {
                  kind: p.kind,
                  method: p.method,
                })
              }
            />
          ))}
        </div>
      </Panel>

      <Panel className="mb-4 bg-surface">
        <h2 className="mb-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Check your understanding
        </h2>
        <ul className="space-y-2">
          {topic.checkpoints.map((c, i) => (
            <li key={c} className="flex gap-3 text-sm">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-card text-[10px] font-semibold">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{c}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <span className="text-sm text-muted-foreground">Lesson · {lesson.progress}% done</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/solve" })}
            className="rounded-xl bg-card px-4 py-2.5 text-sm font-medium ring-1 ring-border transition-colors hover:bg-surface"
          >
            Solve Together
          </button>
          <Link
            to="/practice"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-primary transition-opacity hover:opacity-90"
          >
            Continue Practice
          </Link>
        </div>
      </div>
    </Page>
  );
}

function TutorChip({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-card px-3 py-1.5 text-xs font-medium ring-1 ring-border transition-colors hover:bg-secondary disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function LessonPlaceholder({ message }: { message: string }) {
  return (
    <Page>
      <p className="py-16 text-center text-sm text-muted-foreground">{message}</p>
    </Page>
  );
}

function NoLessonYet() {
  return (
    <Page>
      <PageHeading
        eyebrow="Learn"
        title="Pick a lesson first"
        description="Your tutor works on one lesson at a time so it stays focused on what you're actually studying."
      />
      <Link
        to="/lessons"
        className="inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-primary"
      >
        Go to My Lessons
      </Link>
    </Page>
  );
}
