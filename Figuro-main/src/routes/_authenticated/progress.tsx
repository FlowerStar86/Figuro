import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Page, PageHeading, Panel } from "@/components/figuro/section";
import { useFiguroSession } from "@/lib/figuro-session";
import {
  METHOD_LABEL,
  METHOD_THRESHOLD,
  relativeTime,
  getRemediationForConcept,
} from "@/lib/figuro-activity";
import { runMultiAgentSystem } from "@/lib/figuro-agents";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Your learning progress — Figuro" },
      {
        name: "description",
        content:
          "See your strengths, weak points identified by the multi-agent system, learning activity, and recommended practice focus.",
      },
      { property: "og:title", content: "Your learning progress — Figuro" },
      {
        property: "og:description",
        content: "Multi-agent analytics: strengths, focus areas, progress trends, and recommended next practice.",
      },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const session = useFiguroSession();
  const { lessons, events, materials, folders, selectLesson, activeLessonId } = session;
  const navigate = useNavigate();

  const [activeRemediation, setActiveRemediation] = useState<{
    concept: string;
    lessonId: string;
    signals: number;
    reasons: string[];
  } | null>(null);

  // Run Figuro's Day 6 Coordinator Agent & sub-agents on session data
  const synthesis = runMultiAgentSystem({
    lessons,
    events,
    materials,
    folders,
    currentLessonId: activeLessonId,
  });

  const {
    weakPoint: weakPointRes,
    lesson: lessonAgentRes,
    progress: progressAgentRes,
    action: actionAgentRes,
  } = synthesis.agentOutputs;

  const weakPoints = weakPointRes.weakPoints;
  const strengths = weakPointRes.strongPoints;
  const tendencies = progressAgentRes.effectiveMethods;
  const enoughMethods = tendencies.reduce((n, t) => n + t.tried, 0) >= METHOD_THRESHOLD;

  const lessonTitle = (id: string) => lessons.find((l) => l.id === id)?.title ?? "a lesson";

  const attempts = events.filter((e) => e.kind === "practice_attempt");
  const startedLessons = new Set(events.map((e) => e.lessonId)).size;
  const hints = events.filter((e) => e.kind === "hint_revealed").length;

  const recent = [...events].reverse().slice(0, 8);

  const trendLabel: Record<string, string> = {
    improving: "Improving ↑",
    stable: "Stable →",
    declining: "Needs focus ↓",
    insufficient_data: "Collecting data",
  };

  return (
    <Page>
      <PageHeading
        eyebrow="Progress & Multi-Agent Analytics"
        title="Your Progress"
        description="Powered by Figuro's 5 local agents (Coordinator, Weak-Point, Lesson, Progress, Action). All analytics are generated from your own learning activity."
      />

      {/* Top Metrics Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Lessons worked on", value: String(startedLessons) },
          { label: "Practice attempts", value: String(attempts.length) },
          {
            label: "Average Score",
            value: progressAgentRes.averageScore !== null ? `${progressAgentRes.averageScore}%` : "—",
          },
          {
            label: "Performance Trend",
            value: trendLabel[progressAgentRes.trend] ?? progressAgentRes.trend,
          },
        ].map((s) => (
          <Panel key={s.label} className="p-5">
            <p className="text-2xl font-medium">{s.value}</p>
            <p className="mt-1 text-xs tracking-widest text-muted-foreground uppercase">
              {s.label}
            </p>
          </Panel>
        ))}
      </div>

      {/* Coordinator Agent Executive Synthesis Banner */}
      <Panel className="mb-10 p-5 bg-surface/50 border border-primary/20">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-primary">
            Coordinator Agent Synthesis
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            5 Local Agents Active
          </span>
        </div>
        <h3 className="text-base font-semibold">{synthesis.overallHeadline}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {synthesis.unifiedAdvice}
        </p>
      </Panel>

      {/* Strengths Section */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          Confirmed Strengths
        </h2>
        {strengths.length === 0 ? (
          <EmptyNote>
            Nothing confirmed yet. Once your practice attempts show a concept you handle well,
            it'll appear here.
          </EmptyNote>
        ) : (
          <div className="grid gap-3">
            {strengths.map((s) => (
              <Panel key={`${s.lessonId}-${s.concept}`} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-primary">{s.concept}</p>
                  <span className="text-xs text-muted-foreground">{lessonTitle(s.lessonId)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Shown in {s.signals} {s.signals === 1 ? "attempt" : "attempts"}.
                </p>
              </Panel>
            ))}
          </div>
        )}
      </section>

      {/* Weak Points Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Weak Points (Weak-Point Agent)
          </h2>
          {weakPointRes.struggleSeverity !== "none" && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                weakPointRes.struggleSeverity === "critical"
                  ? "bg-destructive/10 text-destructive"
                  : weakPointRes.struggleSeverity === "moderate"
                    ? "bg-accent/10 text-accent"
                    : "bg-surface text-muted-foreground"
              }`}
            >
              Severity: {weakPointRes.struggleSeverity}
            </span>
          )}
        </div>

        {activeRemediation && (
          <WeakPointRemediationCard
            weakPoint={activeRemediation}
            onResolved={() => setActiveRemediation(null)}
          />
        )}

        {weakPoints.length === 0 ? (
          <EmptyNote>
            Complete a quiz or practice session to detect weak points.
          </EmptyNote>
        ) : (
          <div className="grid gap-3">
            {weakPoints.map((w) => (
              <Panel key={`${w.lessonId}-${w.concept}`} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-accent">{w.concept}</p>
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      {w.signals} {w.signals === 1 ? "signal" : "signals"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{lessonTitle(w.lessonId)}</span>
                </div>

                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground">Why identified:</p>
                  <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground space-y-0.5">
                    {w.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      selectLesson(w.lessonId);
                      setActiveRemediation(w);
                    }}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Practice this concept now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      selectLesson(w.lessonId);
                      void navigate({ to: "/practice" });
                    }}
                    className="rounded-lg bg-card px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-secondary"
                  >
                    Open Practice Page
                  </button>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </section>

      {/* Recommended Next Practice Focus (Action Agent) */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          Recommended Next Focus (Action Agent)
        </h2>
        <Panel className="p-5 border border-dashed border-border bg-surface">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-accent">
                Action Agent Recommendation
              </span>
              <h3 className="text-base font-semibold">{actionAgentRes.actionTitle}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {actionAgentRes.rationale}
              </p>

              {actionAgentRes.actionSteps.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-medium">Recommended Steps:</p>
                  <ol className="mt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                    {actionAgentRes.actionSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (actionAgentRes.targetLessonId) selectLesson(actionAgentRes.targetLessonId);
                void navigate({ to: actionAgentRes.suggestedRoute });
              }}
              className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-primary hover:opacity-90 transition-opacity"
            >
              Start Focus Session →
            </button>
          </div>
        </Panel>
      </section>

      {/* How You Learn Best */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          How You Learn Best (Progress Agent)
        </h2>
        {!enoughMethods ? (
          <EmptyNote>
            Figuro is still learning what works best for you. Try a few different ways in — examples,
            diagrams, step-by-step walkthroughs — and tell the tutor whether they helped.
          </EmptyNote>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tendencies.map((t) => (
              <Panel key={t.method} className="p-4">
                <p className="text-sm font-medium">{METHOD_LABEL[t.method]}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Used {t.tried} {t.tried === 1 ? "time" : "times"}
                  {t.helped > 0 ? ` · you said it helped ${t.helped}×` : " · no feedback yet"}
                </p>
              </Panel>
            ))}
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Based on {tendencies.reduce((n, t) => n + t.tried, 0)} interactions (Figuro needs at
              least {METHOD_THRESHOLD} before saying anything here).
            </p>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          Recent Activity
        </h2>
        {recent.length === 0 ? (
          <EmptyNote>No sessions recorded yet. Start a lesson and this fills in.</EmptyNote>
        ) : (
          <div className="grid gap-3">
            {recent.map((a) => (
              <Panel key={a.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {lessonTitle(a.lessonId)}
                    {typeof a.score === "number" ? ` · ${a.score}% understanding` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(a.at)}
                </span>
              </Panel>
            ))}
          </div>
        )}
      </section>

      {/* Lessons in Progress (Lesson Agent) */}
      <section className="mt-10 mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Lessons in Progress (Lesson Agent)
          </h2>
          <span className="text-xs text-muted-foreground">
            {lessonAgentRes.currentLesson
              ? `Active: ${lessonAgentRes.currentLesson.title}`
              : "No lesson selected"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {lessons.map((l) => (
            <Panel key={l.id} className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: `var(--${l.accent})` }}
                    aria-hidden
                  />
                  <p className="text-sm font-medium">{l.title}</p>
                </div>
                <span className="text-xs font-medium tabular-nums">{l.progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${l.progress}%`, backgroundColor: `var(--${l.accent})` }}
                />
              </div>
            </Panel>
          ))}
        </div>
      </section>
    </Page>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function WeakPointRemediationCard({
  weakPoint,
  onResolved,
}: {
  weakPoint: { concept: string; lessonId: string; signals: number; reasons: string[] };
  onResolved: () => void;
}) {
  const { lessons, record, updateProgress } = useFiguroSession();
  const remediation = getRemediationForConcept(weakPoint.concept);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "incorrect" | "correct">("idle");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const currentQ = remediation.questions[questionIdx % remediation.questions.length]!;

  function checkAnswer() {
    if (!answer.trim()) return;
    const normAns = answer.trim().toLowerCase();
    const isCorrect = currentQ.keywords.some((kw) => normAns.includes(kw));

    if (isCorrect) {
      setStatus("correct");
      setFeedbackMsg(`Nice! You understand ${remediation.concept} better now.`);
      record({
        lessonId: weakPoint.lessonId,
        kind: "practice_attempt",
        label: `Mastered weak concept: ${remediation.concept}`,
        score: 100,
        strongConcepts: [weakPoint.concept],
        method: "practice",
        helped: true,
      });
      const targetLesson = lessons.find((l) => l.id === weakPoint.lessonId);
      const currentProg = targetLesson ? targetLesson.progress : 0;
      updateProgress(weakPoint.lessonId, Math.min(100, currentProg + 5));
    } else {
      setStatus("incorrect");
      setFeedbackMsg(`Not quite yet. ${currentQ.hintIfWrong}`);
      setQuestionIdx((prev) => prev + 1);
      setAnswer("");
      record({
        lessonId: weakPoint.lessonId,
        kind: "practice_attempt",
        label: `Remediation attempt on ${remediation.concept}`,
        score: 30,
        weakConcepts: [weakPoint.concept],
        method: "practice",
      });
    }
  }

  return (
    <Panel className="p-5 border-2 border-accent/40 bg-surface/80 my-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
          ⚠️ You got this wrong — let's work on it
        </span>
        <button
          type="button"
          onClick={onResolved}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Close
        </button>
      </div>

      <h3 className="text-base font-semibold text-foreground">
        Weak Point: {remediation.concept} — You got this question wrong.
      </h3>

      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        <p className="rounded-lg bg-card p-3 border border-border leading-relaxed">
          <strong className="text-foreground font-medium">Explain: </strong>
          {remediation.explanation}
        </p>
        <p className="text-accent font-medium">
          💡 <strong>Hint:</strong> {remediation.hints[0]}
        </p>
      </div>

      {status === "correct" ? (
        <div className="mt-4 rounded-xl bg-primary/10 p-4 border border-primary/30">
          <p className="text-sm font-semibold text-primary">{feedbackMsg}</p>
          <button
            type="button"
            onClick={onResolved}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            Done · Return to Progress
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {status === "incorrect" && (
            <p className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive font-medium border border-destructive/20 leading-relaxed">
              {feedbackMsg}
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Test Question: {currentQ.question}
            </label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") checkAnswer();
              }}
              placeholder="Type your answer here…"
              className="w-full rounded-xl bg-card px-4 py-2.5 text-sm ring-1 ring-border outline-none focus:ring-primary"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={checkAnswer}
              disabled={!answer.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              Submit & Check
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}
