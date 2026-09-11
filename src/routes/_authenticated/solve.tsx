import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Page, PageHeading } from "@/components/figuro/section";
import { LessonBar } from "@/components/figuro/lesson-bar";
import { TutorText } from "@/components/figuro/tutor-text";
import { useFiguroSession } from "@/lib/figuro-session";
import { askTutor } from "@/lib/tutor.functions";

export const Route = createFileRoute("/_authenticated/solve")({
  head: () => ({
    meta: [
      { title: "Solve it together — Figuro" },
      {
        name: "description",
        content:
          "Bring a problem you're stuck on and work toward the answer with guiding questions and progressive hints.",
      },
      { property: "og:title", content: "Solve it together — Figuro" },
      {
        property: "og:description",
        content: "Guided problem solving: questions and progressive hints instead of the answer.",
      },
    ],
  }),
  component: SolvePage,
});

type Message = { role: "user" | "assistant"; content: string };

function SolvePage() {
  const { activeLesson, record, updateProgress, loading, sourceMode } = useFiguroSession();
  const tutor = useServerFn(askTutor);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([]);
    setError(null);
    setDraft("");
  }, [activeLesson?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, busy]);

  if (loading || !activeLesson) return <NoLessonState loading={loading} />;
  const lesson = activeLesson;

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const history: Message[] = [...messages, { role: "user", content: clean }];
    setMessages(history);
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
          mode: "solve",
          messages: history,
        },
      });
      if (result.error) {
        setError(result.error);
        setMessages(messages);
        setDraft(clean);
      } else {
        setMessages([...history, { role: "assistant", content: result.reply }]);
        record({
          lessonId: lesson.id,
          kind: "solve_question",
          label: clean.slice(0, 90),
          method: "conversation",
        });
        updateProgress(lesson.id, Math.min(100, Math.max(0, lesson.progress + 3)));
      }
    } catch {
      setError("Something went wrong reaching the tutor. Please try again.");
      setMessages(messages);
      setDraft(clean);
    } finally {
      setDraft("");
      setBusy(false);
    }
  }

  function handleGoBack() {
    setDraft("");
    if (messages.length > 2) {
      setMessages((prev) => prev.slice(0, -2));
    }
  }

  const presets = [
    `I'm stuck on a ${lesson.title} question.`,
    `Give me a hint for ${lesson.title}.`,
    `Here's what I tried on ${lesson.title} — where did I go wrong?`,
  ];

  return (
    <Page>
      <PageHeading
        eyebrow="Solve"
        title="Solve Together"
        description={`Describe the ${lesson.title} problem you're stuck on. Figuro answers with questions and hints, one step at a time — never the finished solution.`}
      />

      <LessonBar current="solve" />

      <div className="mb-6 flex items-center gap-3">
        <div
          className="grid size-10 place-items-center rounded-full font-semibold text-foreground"
          style={{ backgroundColor: "var(--feature-guided)" }}
        >
          F
        </div>
        <div>
          <p className="text-sm font-medium">Guided session · {lesson.title}</p>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            {lesson.discipline} · hints, not answers
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleGoBack}
            disabled={messages.length <= 2 || busy}
            className="rounded-lg bg-card px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-secondary disabled:opacity-40"
          >
            Go Back
          </button>
          <Link
            to="/lessons"
            className="rounded-lg bg-card px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-secondary"
          >
            Switch lesson
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        {messages.length === 0 && !busy && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-5 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Describe the {lesson.title} problem you are stuck on below, or click below to start a step-by-step guided problem solving session.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void send(`Start guided problem solving session for ${lesson.title}`)}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground ring-1 ring-primary hover:opacity-90 transition-opacity"
              >
                Start Guided Solving
              </button>
            </div>
            <div className="pt-2 flex flex-wrap gap-2">
              {presets.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full bg-card px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="max-w-[85%] self-start">
              <div className="rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-surface p-4 ring-1 ring-border">
                <p className="text-base whitespace-pre-wrap text-pretty">{m.content}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="ml-auto max-w-[85%] self-end">
              <div className="rounded-tl-2xl rounded-bl-2xl rounded-br-2xl bg-primary p-4 text-primary-foreground ring-1 ring-primary">
                <TutorText text={m.content} removeEmojis />
              </div>
            </div>
          ),
        )}

        {busy && (
          <p className="text-sm text-muted-foreground" role="status">
            Figuro is thinking...
          </p>
        )}
        {error && (
          <p className="rounded-xl px-4 py-3 text-sm text-destructive ring-1 ring-destructive/30">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        className="sticky bottom-24 rounded-2xl bg-card p-3 ring-1 ring-border md:bottom-6"
      >
        <label htmlFor="problem" className="sr-only">
          The problem you're stuck on
        </label>
        <textarea
          id="problem"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send(draft);
            }
          }}
          placeholder={`Type or paste your ${lesson.title} problem here…`}
          className="w-full resize-y rounded-xl bg-surface px-4 py-3 text-base leading-relaxed ring-1 ring-border outline-none focus:ring-primary"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoBack}
              disabled={messages.length <= 2 || busy}
              className="rounded-xl bg-card px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-secondary disabled:opacity-40"
            >
              Go Back
            </button>
            <span className="text-xs text-muted-foreground">Staying on {lesson.title}</span>
          </div>
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </Page>
  );
}


function NoLessonState({ loading }: { loading: boolean }) {
  return (
    <Page>
      <PageHeading
        eyebrow="Solve"
        title={loading ? "Loading your lessons…" : "Pick a lesson first"}
        description={loading ? "Getting your account ready." : "Choose a lesson in My Lessons before solving a problem."}
      />
      {!loading && (
        <Link to="/lessons" className="inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-primary">
          Go to My Lessons
        </Link>
      )}
    </Page>
  );
}
