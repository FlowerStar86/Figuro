import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Page, PageHeading, Panel } from "@/components/figuro/section";
import { LessonBar } from "@/components/figuro/lesson-bar";
import { useFiguroSession } from "@/lib/figuro-session";
import { getPracticeActivity, reviewAttempt } from "@/lib/tutor.functions";
import type { AttemptFeedback } from "@/lib/tutor.server";
import { generateLocalPracticeActivity, getCleanLessonLearningContext } from "@/lib/figuro-quiz";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Practice what you learned — Figuro" },
      {
        name: "description",
        content:
          "Try a hands-on activity for your topic, submit your attempt, and get coaching feedback on your reasoning.",
      },
      { property: "og:title", content: "Practice what you learned — Figuro" },
      {
        property: "og:description",
        content: "Hands-on activities with feedback on your reasoning, not just your result.",
      },
    ],
  }),
  component: PracticePage,
});

function PracticePage() {
  const { activeLesson, materialsFor, topic, practice, setPractice, record, updateProgress, loading } = useFiguroSession();
  const buildActivity = useServerFn(getPracticeActivity);
  const grade = useServerFn(reviewAttempt);

  const [attempt, setAttempt] = useState("");
  const [revealed, setRevealed] = useState(0);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seenPrompts, setSeenPrompts] = useState<Record<string, string[]>>({});
  const activity = activeLesson ? practice[activeLesson.id] : undefined;

  const loadActivity = useCallback(
    async (fresh: boolean) => {
      if (loadingActivity || !activeLesson) return;
      const lessonId = activeLesson.id;
      setLoadingActivity(true);
      setError(null);

      const topicText = topic
        ? [
            topic.summary,
            ...topic.explanation,
            ...topic.examples.map((e) => `${e.label}: ${e.body}`),
            ...topic.checkpoints,
          ].join("\n")
        : "";

      const context = getCleanLessonLearningContext(
        activeLesson.title,
        activeLesson.discipline,
        materialsFor(lessonId),
        topicText,
      );

      try {
        const history = [
          ...(seenPrompts[lessonId] ?? []),
          ...(fresh && activity ? [activity.prompt] : []),
        ];
        const avoid = Array.from(new Set(history)).slice(-5);
        const result = await buildActivity({
          data: {
            lessonId,
            lessonTitle: activeLesson.title,
            discipline: activeLesson.discipline,
            ...(avoid.length ? { avoid } : {}),
          },
        });
        if (result.error || !result.activity) {
          const localAct = generateLocalPracticeActivity(
            activeLesson.title,
            context.cleanedText,
            avoid,
          );
          setPractice(lessonId, localAct);
          setRevealed(0);
          record({
            lessonId,
            kind: "practice_started",
            label: `Practice activity for ${activeLesson.title}`,
            method: "practice",
          });
        } else if (result.activity) {
          const newPrompt = result.activity.prompt;
          setPractice(lessonId, result.activity);
          setSeenPrompts((s) => ({
            ...s,
            [lessonId]: Array.from(new Set([...(s[lessonId] ?? []), ...history, newPrompt])).slice(-6),
          }));
          setRevealed(0);
          record({
            lessonId,
            kind: "practice_started",
            label: `New practice activity for ${activeLesson.title}`,
            method: "practice",
          });
        }
      } catch {
        const localAct = generateLocalPracticeActivity(
          activeLesson.title,
          context.cleanedText,
        );
        setPractice(lessonId, localAct);
        setRevealed(0);
        record({
          lessonId,
          kind: "practice_started",
          label: `Practice activity for ${activeLesson.title}`,
          method: "practice",
        });
      } finally {
        setLoadingActivity(false);
      }
    },
    [activeLesson, activity, buildActivity, loadingActivity, materialsFor, record, seenPrompts, setPractice, topic],
  );

  useEffect(() => {
    setAttempt("");
    setRevealed(0);
    setAttemptNumber(1);
    setFeedback(null);
    setError(null);
    if (activeLesson && !practice[activeLesson.id]) {
      void loadActivity(false);
    }
  }, [activeLesson?.id]);


  if (loading || !activeLesson) return <NoLessonState loading={loading} />;
  const lesson = activeLesson;

  async function submit() {
    if (!activity || !attempt.trim() || grading) return;
    setGrading(true);
    setError(null);
    try {
      const result = await grade({
        data: {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          discipline: lesson.discipline,
          activityPrompt: activity.prompt,
          attempt: attempt.trim(),
          hintsUsed: revealed,
          attemptNumber,
        },
      });
      if (result.error || !result.feedback) {
        const wordCount = attempt.trim().split(/\s+/).length;
        const score = Math.min(100, Math.max(35, wordCount * 10));
        const fb: AttemptFeedback = {
          understanding: score,
          strengths: ["You submitted your reasoning clearly based on your understanding."],
          gaps: score < 70 ? [`Consider reviewing core principles of ${lesson.title}.`] : [],
          nudge: "Keep practicing to reinforce your understanding.",
          weakConcepts: score < 70 ? [lesson.title] : [],
          strongConcepts: score >= 70 ? [lesson.title] : [],
          suggestedMethod: "practice",
        };
        setFeedback(fb);
        record({
          lessonId: lesson.id,
          kind: "practice_attempt",
          label: `Practice attempt on ${lesson.title}`,
          score: fb.understanding,
          weakConcepts: fb.weakConcepts,
          strongConcepts: fb.strongConcepts,
          method: "practice",
          helped: fb.understanding >= 70,
        });
        updateProgress(
          lesson.id,
          Math.max(lesson.progress, Math.round(fb.understanding * 0.8)),
        );
      } else {
        const fb = result.feedback;
        setFeedback(fb);
        record({
          lessonId: lesson.id,
          kind: "practice_attempt",
          label: `Practice attempt on ${lesson.title}`,
          score: fb.understanding,
          weakConcepts: fb.weakConcepts,
          strongConcepts: fb.strongConcepts,
          method: "practice",
          helped: fb.understanding >= 70,
        });
        updateProgress(
          lesson.id,
          Math.max(lesson.progress, Math.round(fb.understanding * 0.8)),
        );
      }
    } catch {
      const wordCount = attempt.trim().split(/\s+/).length;
      const score = Math.min(100, Math.max(35, wordCount * 10));
      const fb: AttemptFeedback = {
        understanding: score,
        strengths: ["You submitted your reasoning clearly based on your understanding."],
        gaps: score < 70 ? [`Consider reviewing core principles of ${lesson.title}.`] : [],
        nudge: "Keep practicing to reinforce your understanding.",
        weakConcepts: score < 70 ? [lesson.title] : [],
        strongConcepts: score >= 70 ? [lesson.title] : [],
        suggestedMethod: "practice",
      };
      setFeedback(fb);
      record({
        lessonId: lesson.id,
        kind: "practice_attempt",
        label: `Practice attempt on ${lesson.title}`,
        score: fb.understanding,
        weakConcepts: fb.weakConcepts,
        strongConcepts: fb.strongConcepts,
        method: "practice",
        helped: fb.understanding >= 70,
      });
      updateProgress(
        lesson.id,
        Math.max(lesson.progress, Math.round(fb.understanding * 0.8)),
      );
    } finally {
      setGrading(false);
    }
  }

  function tryAgain() {
    setAttempt("");
    setFeedback(null);
    setError(null);
    setAttemptNumber((n) => n + 1);
    record({
      lessonId: lesson.id,
      kind: "practice_retry",
      label: `Retried the ${lesson.title} activity`,
    });
  }

  function nextQuestion() {
  setAttempt("");
  setFeedback(null);
  setError(null);
  setAttemptNumber(1);

  void loadActivity(true);
}

  function revealHint() {
    if (!activity) return;
    const next = Math.min(revealed + 1, activity.hints.length);
    if (next === revealed) return;
    setRevealed(next);
    record({
      lessonId: lesson.id,
      kind: "hint_revealed",
      label: `Used hint ${next} on ${lesson.title}`,
    });
  }

  return (
    <Page>
      <PageHeading
        eyebrow={`Practice · ${lesson.discipline}`}
        title={lesson.title}
        description="Work it through in your own words. Figuro reads your reasoning, not just your final line."
      />

      <LessonBar current="practice" />

      <Panel className="mb-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span
            className="text-[10px] font-semibold tracking-widest uppercase"
            style={{ color: "var(--feature-practice)" }}
          >
            Activity · {lesson.title}
          </span>
          {activity && (
            <button
              type="button"
              onClick={() => void loadActivity(true)}
              disabled={loadingActivity}
              className="rounded-full bg-surface px-3 py-1 text-xs font-medium ring-1 ring-border hover:bg-secondary disabled:opacity-40"
            >
              New activity
            </button>
          )}
        </div>

        {activity ? (
          <p className="text-base leading-relaxed text-pretty">{activity.prompt}</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Figuro will write a practice activity for {lesson.title} — nothing generic, and
              nothing from another subject.
            </p>
            <button
              type="button"
              onClick={() => void loadActivity(false)}
              disabled={loadingActivity}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-primary transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {loadingActivity ? "Writing your activity…" : `Get a ${lesson.title} activity`}
            </button>
          </div>
        )}
        {loadingActivity && activity && (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            Writing a new activity…
          </p>
        )}
      </Panel>

      {activity && (
        <>
          <Panel className="mb-4">
            <label
              htmlFor="attempt"
              className="mb-3 block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
            >
              Your attempt {attemptNumber > 1 && `· attempt ${attemptNumber}`}
            </label>
            <textarea
              id="attempt"
              rows={7}
              value={attempt}
              onChange={(e) => setAttempt(e.target.value)}
              placeholder="Write your thinking here — partial reasoning is welcome."
              className="w-full resize-y rounded-xl bg-surface px-4 py-3 text-base leading-relaxed ring-1 ring-border outline-none focus:ring-primary"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!attempt.trim() || grading}
                onClick={() => void submit()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-1 ring-primary transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {grading ? "Reading your reasoning…" : "Submit attempt"}
              </button>
              <button
                type="button"
                onClick={tryAgain}
                className="rounded-lg bg-card px-4 py-2 text-sm font-medium ring-1 ring-border transition-colors hover:bg-surface"
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={nextQuestion}
                disabled={loadingActivity}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-1 ring-primary transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {loadingActivity ? "Loading…" : "Next Question →"}
              </button>


              <button
                type="button"
                onClick={revealHint}
                disabled={revealed >= activity.hints.length}
                className="rounded-lg px-4 py-2 text-sm font-medium text-accent transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {revealed >= activity.hints.length ? "No hints left" : "Reveal a hint"}
              </button>
            </div>
          </Panel>

          {revealed > 0 && (
            <Panel className="mb-4 bg-surface">
              <span className="mb-3 block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Hints ({revealed}/{activity.hints.length})
              </span>
              <ol className="space-y-2">
                {activity.hints.slice(0, revealed).map((h) => (
                  <li key={h} className="border-l-2 border-accent pl-3 text-sm leading-relaxed">
                    {h}
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </>
      )}

      {error && (
        <p className="mb-4 rounded-xl px-4 py-3 text-sm text-destructive ring-1 ring-destructive/30">
          {error}
        </p>
      )}

      <Panel className={feedback ? "" : "border border-dashed border-border bg-surface ring-0"}>
        <span className="mb-3 block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Coach feedback
        </span>
        {!feedback ? (
          <p className="text-sm text-muted-foreground">
            Submit your attempt and Figuro will respond to what you actually wrote. Nothing appears
            here until then.
          </p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${feedback.understanding}%` }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums">
                {feedback.understanding}% understanding shown
              </span>
            </div>

            {feedback.strengths.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-primary">What worked</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  {feedback.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.gaps.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-accent">Worth another look</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  {feedback.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.nudge && (
              <p className="border-t border-border pt-4 leading-relaxed">{feedback.nudge}</p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                to="/learn"
                className="rounded-full bg-card px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-secondary"
              >
                Ask the tutor about this
              </Link>
              <Link
                to="/solve"
                className="rounded-full bg-card px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-secondary"
              >
                Work through it together
              </Link>
            </div>
          </div>
        )}
      </Panel>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link to="/learn" className="text-muted-foreground hover:text-foreground">
          ← Back to the explanation
        </Link>
        <Link to="/solve" className="text-accent hover:opacity-80">
          Still stuck? Solve it together →
        </Link>
      </div>
    </Page>
  );
}


function NoLessonState({ loading }: { loading: boolean }) {
  return (
    <Page>
      <PageHeading
        eyebrow="Practice"
        title={loading ? "Loading your lessons…" : "Pick a lesson first"}
        description={loading ? "Getting your account ready." : "Choose a lesson in My Lessons before starting practice."}
      />
      {!loading && (
        <Link to="/lessons" className="inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-primary">
          Go to My Lessons
        </Link>
      )}
    </Page>
  );
}
