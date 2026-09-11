import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Page, PageHeading, Panel } from "@/components/figuro/section";
import { LessonBar } from "@/components/figuro/lesson-bar";
import { useFiguroSession } from "@/lib/figuro-session";
import {
  type QuizQuestion,
  type QuizResult,
  answerMatches,
  createQuestions,
  getCleanLessonLearningContext,
  splitMaterial,
} from "@/lib/figuro-quiz";

export const Route = createFileRoute("/_authenticated/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz — Figuro" },
      {
        name: "description",
        content:
          "Test what you understand, get immediate feedback on your materials, and track weak concepts.",
      },
      { property: "og:title", content: "Quiz — Figuro" },
      {
        property: "og:description",
        content: "Interactive quizzes generated locally from your lesson study materials.",
      },
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  const { activeLesson, materialsFor, topic, record, loading, selectLesson } = useFiguroSession();
  const navigate = useNavigate();

  const [subject, setSubject] = useState("");
  const [materialsText, setMaterialsText] = useState("");
  const [questionCount, setQuestionCount] = useState(5);

  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [results, setResults] = useState<QuizResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");

  const [hasUploadedMaterials, setHasUploadedMaterials] = useState(false);

  // Populate subject and materials text when activeLesson changes or mounts using clean pipeline
  useEffect(() => {
    if (!activeLesson) return;
    setSubject(activeLesson.title);

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
      materialsFor(activeLesson.id),
      topicText,
    );

    setHasUploadedMaterials(context.hasUploadedMaterials);
    if (context.cleanedText.trim()) {
      setMaterialsText(context.cleanedText.trim());
    }
  }, [activeLesson, materialsFor, topic]);

  const sourceQuestionCount = useMemo(
    () => splitMaterial(materialsText).length * 4,
    [materialsText],
  );

  const currentQuestion = questions[currentIndex];

  function startQuiz() {
    setError("");

    const cleanSubject = subject.trim() || activeLesson?.title || "General Subject";
    const cleanMaterials = materialsText.trim();

    if (!cleanMaterials) {
      setError("Please attach or paste study materials first.");
      return;
    }

    const generated = createQuestions(cleanSubject, cleanMaterials);

    if (generated.length === 0) {
      setError("Couldn't find enough readable material (lines of 25+ characters needed). Add more notes or text.");
      return;
    }

    const selected = generated.slice(0, Math.min(questionCount, generated.length));

    setQuestions(selected);
    setCurrentIndex(0);
    setCurrentAnswer("");
    setSubmitted(false);
    setResults([]);
    setFinished(false);
    setQuizStarted(true);

    record({
      lessonId: activeLesson?.id ?? "quiz-session",
      kind: "practice_started",
      label: `Started ${selected.length}-question Quiz on ${cleanSubject}`,
      method: "practice",
    });
  }

  function submitAnswer() {
    if (!currentQuestion || !currentAnswer.trim() || submitted) return;

    const isCorrect = answerMatches(currentQuestion, currentAnswer);

    setResults((prev) => [
      ...prev,
      {
        question: currentQuestion,
        userAnswer: currentAnswer,
        correct: isCorrect,
      },
    ]);

    setSubmitted(true);

    // Record multi-agent activity event for weak-point tracking
    record({
      lessonId: activeLesson?.id ?? "quiz-session",
      kind: "practice_attempt",
      label: `Quiz question attempt (${currentQuestion.concept})`,
      score: isCorrect ? 100 : 20,
      weakConcepts: isCorrect ? [] : [currentQuestion.concept],
      strongConcepts: isCorrect ? [currentQuestion.concept] : [],
      method: "practice",
      helped: isCorrect,
    });
  }

  function nextQuestion() {
    if (currentIndex >= questions.length - 1) {
      setFinished(true);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setCurrentAnswer("");
    setSubmitted(false);
  }

  function restart() {
    setQuizStarted(false);
    setQuestions([]);
    setCurrentIndex(0);
    setCurrentAnswer("");
    setSubmitted(false);
    setResults([]);
    setFinished(false);
    setError("");
  }

  if (loading) {
    return (
      <Page>
        <PageHeading
          eyebrow="Quiz"
          title="Loading your lessons…"
          description="Getting your account and study materials ready."
        />
      </Page>
    );
  }

  // --- QUIZ SETUP SCREEN ---
  if (!quizStarted) {
    return (
      <Page>
        <PageHeading
          eyebrow="Quiz · Knowledge Assessment"
          title="Test Your Understanding 🌱"
          description="Assess what you've learned. Questions are generated automatically from your lesson's cleaned study materials."
        />

        <LessonBar current="quiz" />

        <Panel className="space-y-4">
          <div>
            <label htmlFor="subject" className="block mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Subject / Lesson Title
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Cell Biology, Thermodynamics"
              className="w-full rounded-xl bg-surface px-4 py-2.5 text-base ring-1 ring-border outline-none focus:ring-primary"
            />
          </div>

          {/* Auto-Loaded Materials Banner & Details */}
          {hasUploadedMaterials ? (
            <div className="rounded-xl bg-primary/10 p-4 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">📁</span>
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Attached Lesson Materials Auto-Loaded
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Using cleaned readable notes & uploaded files from <strong>{activeLesson?.title}</strong>. No copy-pasting required!
                  </p>
                </div>
              </div>

              <details className="pt-1">
                <summary className="cursor-pointer text-xs font-medium text-primary underline">
                  View or edit source material text
                </summary>
                <div className="mt-2 space-y-2">
                  <textarea
                    id="materials"
                    rows={6}
                    value={materialsText}
                    onChange={(e) => setMaterialsText(e.target.value)}
                    className="w-full resize-y rounded-xl bg-surface px-4 py-3 text-xs leading-relaxed ring-1 ring-border outline-none focus:ring-primary"
                  />
                  <div className="rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground border border-border">
                    Approximate source sentences: <strong>{sourceQuestionCount / 4}</strong> (up to <strong>{sourceQuestionCount}</strong> possible questions)
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <div>
              <label htmlFor="materials" className="block mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Student Study Materials & Notes (Fallback Input)
              </label>
              <textarea
                id="materials"
                rows={8}
                value={materialsText}
                onChange={(e) => setMaterialsText(e.target.value)}
                placeholder={`Paste notes or study text here when no files are uploaded.`}
                className="w-full resize-y rounded-xl bg-surface px-4 py-3 text-base leading-relaxed ring-1 ring-border outline-none focus:ring-primary"
              />
              <div className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground border border-border">
                Approximate source sentences detected: <strong>{sourceQuestionCount / 4}</strong> (up to <strong>{sourceQuestionCount}</strong> possible questions)
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="question-count" className="block mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Number of Assessment Questions
              </label>
              <select
                id="question-count"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full rounded-xl bg-surface px-4 py-2.5 text-sm ring-1 ring-border outline-none focus:ring-primary"
              >
                <option value={3}>3 questions</option>
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={15}>15 questions</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-xl px-4 py-3 text-sm text-destructive ring-1 ring-destructive/30">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={startQuiz}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground ring-1 ring-primary hover:opacity-90 transition-opacity"
          >
            Start Quiz Assessment 🌱
          </button>
        </Panel>
      </Page>
    );
  }

  // --- QUIZ FINISHED / RESULTS SCREEN ---
  if (finished) {
    const correctCount = results.filter((r) => r.correct).length;
    const percentage = results.length === 0 ? 0 : Math.round((correctCount / results.length) * 100);

    const weakConcepts = new Map<string, number>();
    results.forEach((r) => {
      if (!r.correct) {
        weakConcepts.set(r.question.concept, (weakConcepts.get(r.question.concept) ?? 0) + 1);
      }
    });

    const weakList = [...weakConcepts.entries()].sort((a, b) => b[1] - a[1]);

    return (
      <Page>
        <PageHeading
          eyebrow={`Quiz · ${subject || "Results"}`}
          title="Quiz Complete 🌿"
          description="Here is your overall performance breakdown and detected weak points."
        />

        <LessonBar current="practice" />

        <Panel className="mb-6 p-6 text-center space-y-3">
          <p className="text-6xl font-extrabold text-primary tabular-nums">{percentage}%</p>
          <p className="text-sm text-muted-foreground font-medium">
            {correctCount} of {results.length} questions correct
          </p>
        </Panel>

        <Panel className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Weak Points Detected
          </h3>

          {weakList.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg bg-surface p-4 border border-dashed border-border">
              🎉 Excellent job! No weak concepts were detected from this quiz session.
            </p>
          ) : (
            <div className="space-y-2">
              {weakList.map(([concept, count]) => (
                <div
                  key={concept}
                  className="flex items-center justify-between gap-4 rounded-xl bg-surface p-4 text-sm ring-1 ring-border"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-accent truncate">{concept}</p>
                    <p className="text-xs text-muted-foreground">
                      {count} incorrect {count === 1 ? "answer" : "answers"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                    Needs practice
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={restart}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-primary hover:opacity-90"
          >
            Quiz Again
          </button>
          <Link
            to="/progress"
            className="rounded-xl bg-card px-4 py-2.5 text-sm font-medium ring-1 ring-border hover:bg-secondary"
          >
            View Multi-Agent Progress Page →
          </Link>
        </div>
      </Page>
    );
  }

  if (!currentQuestion) return null;

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const isCorrect = submitted && answerMatches(currentQuestion, currentAnswer);

  // --- ACTIVE QUIZ QUESTION SCREEN ---
  return (
    <Page>
      <PageHeading
        eyebrow={`Quiz · ${subject}`}
        title={`Question ${currentIndex + 1} of ${questions.length}`}
        description="Select or write your answer based on your study materials."
      />

      <LessonBar current="practice" />

      {/* Progress Track */}
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <Panel className="mb-6 space-y-4">
        {/* Question Metadata */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 font-semibold text-accent">
            {currentQuestion.difficulty}
          </span>
          <span className="font-medium text-muted-foreground uppercase tracking-wider">
            Concept: <strong className="text-foreground">{currentQuestion.concept}</strong>
          </span>
        </div>

        {/* Question Text */}
        <h2 className="text-lg font-semibold leading-relaxed text-pretty">
          {currentQuestion.question.split("\n").map((line, idx) => (
            <span key={idx}>
              {line}
              {idx < currentQuestion.question.split("\n").length - 1 && <br />}
            </span>
          ))}
        </h2>

        {/* Answer Options according to type */}
        <div className="space-y-2.5 pt-2">
          {currentQuestion.type === "multiple-choice" &&
            currentQuestion.options?.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setCurrentAnswer(option)}
                disabled={submitted}
                className={`w-full text-left rounded-xl p-4 text-sm font-medium transition-all ring-1 ${
                  currentAnswer === option
                    ? "bg-primary/10 text-primary ring-primary"
                    : "bg-surface text-foreground ring-border hover:bg-secondary"
                }`}
              >
                {option}
              </button>
            ))}

          {currentQuestion.type === "true-false" && (
            <div className="grid grid-cols-2 gap-3">
              {["True", "False"].map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setCurrentAnswer(opt)}
                  disabled={submitted}
                  className={`rounded-xl p-4 text-center text-sm font-semibold transition-all ring-1 ${
                    currentAnswer === opt
                      ? "bg-primary/10 text-primary ring-primary"
                      : "bg-surface text-foreground ring-border hover:bg-secondary"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {(currentQuestion.type === "short-answer" || currentQuestion.type === "fill-blank") && (
            <textarea
              rows={4}
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              disabled={submitted}
              placeholder={
                currentQuestion.type === "fill-blank"
                  ? "Type the missing concept..."
                  : "Explain in your own words..."
              }
              className="w-full resize-y rounded-xl bg-surface px-4 py-3 text-base leading-relaxed ring-1 ring-border outline-none focus:ring-primary disabled:opacity-70"
            />
          )}
        </div>

        {/* Immediate Feedback Box */}
        {submitted && (
          <div
            className={`mt-4 rounded-xl p-4 text-sm ring-1 ${
              isCorrect
                ? "bg-primary/10 text-primary ring-primary/30"
                : "bg-destructive/10 text-destructive ring-destructive/30"
            }`}
          >
            <p className="font-semibold">{isCorrect ? "Correct! 🌿" : "Not quite."}</p>
            <p className="mt-1 text-xs">
              {isCorrect
                ? "Your answer matches the information from the supplied materials."
                : `Review this concept: ${currentQuestion.concept}`}
            </p>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold underline">
                Show source from materials
              </summary>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed italic">
                "{currentQuestion.sourceText}"
              </p>
            </details>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
          {!submitted ? (
            <button
              type="button"
              onClick={submitAnswer}
              disabled={!currentAnswer.trim()}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground ring-1 ring-primary hover:opacity-90 disabled:opacity-40"
            >
              Submit Answer
            </button>
          ) : (
            <button
              type="button"
              onClick={nextQuestion}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground ring-1 ring-primary hover:opacity-90"
            >
              {currentIndex === questions.length - 1 ? "See Results →" : "Next Question →"}
            </button>
          )}

          <button
            type="button"
            onClick={restart}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Exit Quiz
          </button>
        </div>
      </Panel>
    </Page>
  );
}