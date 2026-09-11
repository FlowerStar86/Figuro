// Sample/placeholder data for the Figuro MVP.
// Replace these with real AI + database reads once agents and Cloud are wired up.

export type Topic = {
  slug: string;
  title: string;
  discipline: string;
  summary: string;
  explanation: string[];
  examples: { label: string; body: string }[];
  checkpoints: string[];
  practice: {
    prompt: string;
    starter: string;
    hints: string[];
  };
};

export const TOPICS: Topic[] = [
  {
    slug: "thermodynamics",
    title: "Thermodynamics",
    discipline: "Physics",
    summary: "Why systems drift toward disorder, and what energy has to do with it.",
    explanation: [
      "Everything in the universe moves toward disorder. Think of it like a room that never gets cleaned; it naturally becomes messier unless you put energy into tidying it up.",
      "Entropy is the bookkeeping for that messiness. A system left alone will always find the arrangement it can reach in the most ways — and messy arrangements simply outnumber tidy ones.",
    ],
    examples: [
      {
        label: "Everyday",
        body: "A hot coffee cools to room temperature, never the other way around. Heat spreads out because spread-out is more likely than concentrated.",
      },
      {
        label: "Formal",
        body: "ΔS_universe ≥ 0 for any spontaneous process. The equality only holds for a perfectly reversible change.",
      },
    ],
    checkpoints: [
      "Say entropy in your own words, without the word 'disorder'.",
      "Name one process that looks like it lowers entropy locally.",
      "Explain where the 'missing' entropy went in that process.",
    ],
    practice: {
      prompt:
        "A refrigerator keeps its inside cold, which lowers the entropy of the food. Does this break the second law? Explain what happens to the entropy of the kitchen as a whole.",
      starter: "",
      hints: [
        "Where does the heat pulled out of the fridge actually end up?",
        "The fridge is not an isolated system. What crosses its boundary?",
        "Compare entropy lost inside the box with entropy dumped into the room.",
      ],
    },
  },
  {
    slug: "linear-algebra",
    title: "Linear Algebra",
    discipline: "Mathematics",
    summary: "Vectors, matrices, and what it means to transform a space.",
    explanation: [
      "A matrix is not a grid of numbers — it is an instruction for moving space. Multiply a vector by a matrix and you are asking: where does this arrow land after the space is stretched, rotated, or squashed?",
      "Once you see matrices as transformations, ideas like determinant (how much area is scaled) and eigenvector (the arrows that refuse to change direction) stop being formulas and start being pictures.",
    ],
    examples: [
      {
        label: "Everyday",
        body: "Rotating an image in a photo editor is a 2x2 matrix applied to every pixel coordinate.",
      },
      {
        label: "Formal",
        body: "If Av = λv, then v is an eigenvector of A and λ is its eigenvalue — the transformation only scales v.",
      },
    ],
    checkpoints: [
      "Describe what a determinant of 0 means geometrically.",
      "Sketch what a shear matrix does to a unit square.",
      "Explain why eigenvectors are useful.",
    ],
    practice: {
      prompt:
        "The matrix [[2, 0], [0, 0.5]] is applied to the unit square. Describe the resulting shape and compute its area. Then say what the determinant told you before you computed anything.",
      starter: "",
      hints: [
        "What does each diagonal entry do to its own axis?",
        "Area scaling and determinant are the same story told twice.",
        "Multiply the two stretch factors and compare to your sketch.",
      ],
    },
  },
  {
    slug: "ancient-stoicism",
    title: "Ancient Stoicism",
    discipline: "Philosophy",
    summary: "The dichotomy of control and the practice of reasoned action.",
    explanation: [
      "Stoicism begins with a sorting exercise: some things are up to us (our judgments, intentions, responses) and some are not (other people, outcomes, the past). Almost all suffering, the Stoics argued, comes from confusing the two categories.",
      "The goal is not to feel nothing. It is to place your sense of well-being entirely inside the part of life you actually govern.",
    ],
    examples: [
      {
        label: "Everyday",
        body: "You prepare thoroughly for an exam. The preparation is yours; the grade is not. Judging yourself by the grade hands your peace to a stranger.",
      },
      {
        label: "Source",
        body: "Epictetus opens the Enchiridion with exactly this split — the first sentence of the whole tradition.",
      },
    ],
    checkpoints: [
      "List three things from your week that were not up to you.",
      "Rewrite one of them as a judgment you could change.",
      "Name where Stoicism differs from simple indifference.",
    ],
    practice: {
      prompt:
        "A friend cancels plans at the last minute and you feel insulted. Apply the dichotomy of control: separate the event from your judgment, and write what a Stoic response would look like without pretending you feel nothing.",
      starter: "",
      hints: [
        "What exactly happened, stated with no adjectives?",
        "Which part of your reaction is the event, and which is your interpretation?",
        "What would you still choose to do if the insult reading were false?",
      ],
    },
  },
  {
    slug: "advanced-limits",
    title: "Advanced Limits",
    discipline: "Mathematics",
    summary: "Mastering the boundary concepts behind continuity and derivatives.",
    explanation: [
      "A limit answers a careful question: not 'what is the value here?' but 'what value is the function heading toward?' The function does not even have to be defined at the point.",
      "Indeterminate forms like 0/0 are not answers — they are signals that the expression needs to be rewritten before it will speak.",
    ],
    examples: [
      {
        label: "Everyday",
        body: "Zooming into a curved road: the closer you look, the straighter it seems. That 'heading toward' straightness is a limit.",
      },
      {
        label: "Formal",
        body: "lim(x→0) sin(x)/x = 1, even though the expression is 0/0 at x = 0.",
      },
    ],
    checkpoints: [
      "Explain why 0/0 is called indeterminate rather than undefined.",
      "Give a function with a limit at a point where it is not defined.",
      "State when L'Hôpital's rule is actually allowed.",
    ],
    practice: {
      prompt:
        "Evaluate lim(x→2) (x² − 4)/(x − 2) without using L'Hôpital's rule, and explain in one sentence why direct substitution failed.",
      starter: "",
      hints: [
        "Try substituting first — what form do you get?",
        "The numerator factors. What cancels?",
        "After cancelling, substitution is legal again. Why?",
      ],
    },
  },
];

export const DEFAULT_TOPIC_SLUG = "thermodynamics";

export function findTopic(slug: string | null | undefined): Topic {
  return TOPICS.find((t) => t.slug === slug) ?? TOPICS[0]!;
}

export type Skill = {
  name: string;
  score: number;
  note: string;
  kind: "strength" | "focus";
};

export const SKILLS: Skill[] = [
  { name: "Logical Deduction", score: 84, note: "Last active 2h ago", kind: "strength" },
  { name: "Entropy & Energy Flow", score: 76, note: "3 practices completed", kind: "strength" },
  { name: "Abstract Visualization", score: 32, note: "Focus area", kind: "focus" },
  { name: "Limits & Continuity", score: 41, note: "2 attempts, 1 retry", kind: "focus" },
];

export const RECENT_ACTIVITY = [
  { title: "Thermodynamics — guided explanation", meta: "Learn · 2h ago", state: "Completed" },
  { title: "Refrigerator entropy problem", meta: "Practice · Yesterday", state: "Retried once" },
  { title: "sin(x²) derivative", meta: "Solve · 2 days ago", state: "Solved with 2 hints" },
  { title: "Eigenvectors intuition", meta: "Learn · 4 days ago", state: "Completed" },
];

export const RECOMMENDED_NEXT = {
  slug: "advanced-limits",
  title: "Advanced Limits",
  blurb: "Mastering the boundary concepts.",
};

export const SAMPLE_FEEDBACK = {
  strengths: [
    "You correctly separated the fridge interior from its surroundings.",
    "Your reasoning about heat direction is sound.",
  ],
  gaps: [
    "The entropy dumped into the kitchen is not yet quantified in your answer.",
    "Try naming the work input from the compressor explicitly.",
  ],
  nudge: "You are one step away. What does the compressor add to the total energy budget?",
};
