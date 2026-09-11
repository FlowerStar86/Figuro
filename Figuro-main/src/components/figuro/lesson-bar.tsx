import { Link } from "@tanstack/react-router";

import { useFiguroSession } from "@/lib/figuro-session";

/**
 * Sticky context strip: shows which lesson is active and keeps
 * Lesson -> Quiz -> Practice -> Solve one tap apart on every screen.
 */
export function LessonBar({
  current,
}: {
  current: "learn" | "quiz" | "practice" | "solve" | "flashcards";
}) {
  const { activeLesson } = useFiguroSession();

  if (!activeLesson) return null;

  const steps = [
    { key: "learn", to: "/learn", label: "Return to Lesson", short: "Lesson" },
    { key: "quiz", to: "/quiz", label: "Quiz", short: "Quiz" },
    { key: "practice", to: "/practice", label: "Continue Practice", short: "Practice" },
    { key: "flashcards", to: "/flashcards", label: "Flashcards", short: "Cards" },
    { key: "solve", to: "/solve", label: "Solve Together", short: "Solve" },
  ] as const;

  const displayProgress = Math.min(100, Math.max(0, activeLesson.progress));

  return (
    <div className="mb-6 rounded-2xl bg-card p-3 ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 px-1">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: `var(--${activeLesson.accent})` }}
            aria-hidden
          />

          <span className="truncate text-sm font-medium">
            {activeLesson.title}
          </span>

          <span className="hidden text-xs text-muted-foreground sm:inline">
            · {displayProgress}% complete
          </span>

          <Link
            to="/lessons"
            className="ml-1 rounded-md px-2 py-1 text-xs font-medium text-accent hover:underline"
          >
            Switch
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {steps.map((s) => (
            <Link
              key={s.key}
              to={s.to}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
                s.key === current
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-surface ring-border hover:bg-secondary"
              }`}
            >
              <span className="sm:hidden">{s.short}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${displayProgress}%` }}
        />
      </div>
    </div>
  );
}