import { createFileRoute, Link } from "@tanstack/react-router";
import heroImage from "@/assets/figuro-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Figuro — Don't just get the answer. Figure it out." },
      {
        name: "description",
        content:
          "Figuro is a personalized AI learning coach that helps you understand topics, practice hands-on, and work through problems with guided hints.",
      },
      { property: "og:title", content: "Figuro — Don't just get the answer. Figure it out." },
      {
        property: "og:description",
        content:
          "A curious coach that helps you master complex topics through active inquiry and guided discovery.",
      },
    ],
  }),
  component: HomePage,
});

const PILLARS = [
  {
    title: "Personalized Tutor",
    body: "Plain-language explanations that adapt to what you already know.",
    color: "var(--feature-tutor)",
  },
  {
    title: "Weak-Point Detection",
    body: "Figuro notices where your reasoning slips and points you there.",
    color: "var(--feature-weakpoint)",
  },
  {
    title: "Hands-on Practice",
    body: "Real attempts with feedback on your thinking, not just your result.",
    color: "var(--feature-practice)",
  },
  {
    title: "Guided Problem Solving",
    body: "Stuck? You get questions and small hints instead of the answer.",
    color: "var(--feature-guided)",
  },
  {
    title: "Adaptive Learning",
    body: "Each lesson keeps its own pace and progress as you go.",
    color: "var(--feature-adaptive)",
  },
  {
    title: "My Lessons",
    body: "Keep several topics on the shelf and continue any of them.",
    color: "var(--feature-agents)",
  },
];

function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-12 pb-32 md:pb-20">
      <section className="flex flex-col items-center text-center">
        <span className="mb-4 inline-block rounded-full bg-secondary px-3 py-1 text-[11px] font-medium tracking-widest text-secondary-foreground uppercase">
          Figuro Learning
        </span>
        <h1 className="mb-4 max-w-[18ch] text-4xl leading-tight font-medium text-balance md:text-5xl">
          Don't just get the answer. Figure it out.
        </h1>
        <p className="mx-auto max-w-[38ch] text-base text-pretty text-muted-foreground">
          A friendly AI coach that helps you understand your topics, practice them, and work through
          the parts you're stuck on.
        </p>

        <img
          src={heroImage}
          alt="A student reaching toward a glowing geometric shape"
          width={944}
          height={704}
          className="mt-8 mb-8 w-full rounded-2xl bg-surface object-cover ring-1 ring-border"
        />

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Link
            to="/learn"
            className="flex-1 rounded-2xl bg-primary py-4 text-center text-sm font-medium text-primary-foreground ring-1 ring-primary transition-opacity hover:opacity-90"
          >
            Start Learning
          </Link>
          <Link
            to="/lessons"
            className="flex-1 rounded-2xl bg-card py-4 text-center text-sm font-medium ring-1 ring-border transition-colors hover:bg-surface"
          >
            My Lessons
          </Link>
        </div>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-2xl bg-card p-5 ring-1 ring-border">
            <span
              className="mb-3 block size-8 rounded-xl"
              style={{ backgroundColor: p.color }}
              aria-hidden
            />
            <h2 className="mb-2 text-base font-medium">{p.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

