import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Page, PageHeading, Panel } from "@/components/figuro/section";
import { LessonBar } from "@/components/figuro/lesson-bar";
import { useFiguroSession } from "@/lib/figuro-session";
import { cleanMaterialsText, isNoiseLine, shuffle } from "@/lib/figuro-quiz";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — Figuro" },
      {
        name: "description",
        content:
          "Study key concepts and definitions automatically generated from your lesson materials.",
      },
      { property: "og:title", content: "Flashcards — Figuro" },
      {
        property: "og:description",
        content: "Interactive flashcards with front/back flipping and weak point tracking.",
      },
    ],
  }),
  component: FlashcardsPage,
});

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  concept: string;
  source: string;
};

function cleanFlashcardText(str: string): string {
  if (!str) return "";
  return str
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2000}-\u{32FF}\u{1F900}-\u{1F9FF}\u{1F000}-\u{1F02F}]/gu, "")
    .replace(/[🔀🌱🌿🎉💡📊🔹⚡🛡️🎧🎮📝←→🔄⚠️]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const DEFAULT_CELLS_CARDS: Flashcard[] = [
  {
    id: "card-cells-1",
    front: "What is the primary function of the Nucleus?",
    back: "The nucleus controls all cell activities and houses the genetic material (DNA).",
    concept: "Nucleus",
    source: "Cell Biology Core Principles",
  },
  {
    id: "card-cells-2",
    front: "What is the role of Mitochondria in a cell?",
    back: "Mitochondria produce ATP energy through cellular respiration, powering cell processes.",
    concept: "Mitochondria",
    source: "Cell Biology Core Principles",
  },
  {
    id: "card-cells-3",
    front: "What does the Cell Membrane regulate?",
    back: "It uses selective permeability to control what enters and leaves the cell to maintain balance.",
    concept: "Cell Membrane",
    source: "Cell Biology Core Principles",
  },
  {
    id: "card-cells-4",
    front: "Which structure provides rigid support in plant cells?",
    back: "The Cell Wall provides rigid structural support and shape, absent in animal cells.",
    concept: "Cell Wall",
    source: "Cell Biology Core Principles",
  },
  {
    id: "card-cells-5",
    front: "What is the function of Chloroplasts in plant cells?",
    back: "Chloroplasts capture sunlight to carry out photosynthesis, converting light into chemical energy.",
    concept: "Chloroplasts",
    source: "Cell Biology Core Principles",
  },
];

export function generateFlashcards(
  lessonTitle: string,
  discipline: string,
  materialsText?: string,
  checkpoints: string[] = [],
  topicConcepts: { name: string; fact: string }[] = [],
): Flashcard[] {
  const cards: Flashcard[] = [];
  const noiseSet = new Set(["john", "wiley", "sons", "inc", "copyright", "reserved", "rights", "isbn"]);

  // 1. Generate cards ONLY from taught topic concepts
  if (topicConcepts && topicConcepts.length > 0) {
    topicConcepts.forEach((c, idx) => {
      cards.push({
        id: `topic-card-${idx}`,
        front: cleanFlashcardText(`What is the primary role of ${c.name}?`),
        back: cleanFlashcardText(`${c.name}: ${c.fact}`),
        concept: cleanFlashcardText(c.name),
        source: cleanFlashcardText(`${lessonTitle} Concept`),
      });
    });
  }

  // 2. Extract from materials ONLY lines matching taught lesson concepts
  if (materialsText) {
    const cleaned = cleanMaterialsText(materialsText);
    const lines = cleaned
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 25 && !isNoiseLine(l));

    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();
      let matchedConcept = "";
      if (topicConcepts.length > 0) {
        const found = topicConcepts.find((tc) => lower.includes(tc.name.toLowerCase()));
        if (found) matchedConcept = found.name;
      }
      if (matchedConcept || topicConcepts.length === 0) {
        cards.push({
          id: `mat-card-${idx}`,
          front: cleanFlashcardText(`Key Concept: ${matchedConcept || lessonTitle}`),
          back: cleanFlashcardText(line),
          concept: cleanFlashcardText(matchedConcept || lessonTitle),
          source: cleanFlashcardText(`${lessonTitle} Materials`),
        });
      }
    });
  }

  // 3. Checkpoints
  checkpoints.forEach((cp, idx) => {
    cards.push({
      id: `cp-card-${idx}`,
      front: cleanFlashcardText(`Self-Check Question: ${cp}`),
      back: cleanFlashcardText(`Review this core principle for ${lessonTitle}.`),
      concept: cleanFlashcardText("Checkpoint"),
      source: cleanFlashcardText(`${lessonTitle} Checkpoints`),
    });
  });

  if (cards.length === 0) {
    cards.push({
      id: "default-card-1",
      front: cleanFlashcardText(`Core Principle of ${lessonTitle}`),
      back: cleanFlashcardText(`Define the primary mechanism that governs ${lessonTitle} in ${discipline}.`),
      concept: cleanFlashcardText(lessonTitle),
      source: cleanFlashcardText(lessonTitle),
    });
  }

  return cards;
}

function FlashcardsPage() {
  const { activeLesson, topic, materialsFor, record, updateProgress, loading } = useFiguroSession();
  const navigate = useNavigate();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [customCards, setCustomCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [struggledCards, setStruggledCards] = useState<Flashcard[]>([]);
  const [finished, setFinished] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [customFront, setCustomFront] = useState("");
  const [customBack, setCustomBack] = useState("");

  const handleGoBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      void navigate({ to: "/lessons" });
    }
  }, [navigate]);

  useEffect(() => {
    if (!activeLesson) return;
    const lessonMats = materialsFor(activeLesson.id);
    const textPieces = lessonMats
      .map((m) => m.content)
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0);

    const topicText = topic
      ? [
          topic.summary,
          ...topic.explanation,
          ...topic.examples.map((e) => `${e.label}: ${e.body}`),
        ].join("\n")
      : "";

    const combinedText = [...textPieces, topicText].filter(Boolean).join("\n\n");
    const generated = generateFlashcards(
      activeLesson.title,
      activeLesson.discipline,
      combinedText,
      topic?.checkpoints ?? [],
      topic?.concepts ?? [],
    );

    setCards([...customCards, ...shuffle(generated)]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredCount(0);
    setStruggledCards([]);
    setFinished(false);
  }, [activeLesson, customCards, materialsFor, topic]);

  const currentCard = cards[currentIndex];

  const handleAddFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFront.trim() || !customBack.trim() || !activeLesson) return;

    const newCard: Flashcard = {
      id: `custom-card-${Date.now()}`,
      front: cleanFlashcardText(customFront),
      back: cleanFlashcardText(customBack),
      concept: cleanFlashcardText("Custom Flashcard"),
      source: cleanFlashcardText(`${activeLesson.title} Notes`),
    };

    setCustomCards((prev) => [newCard, ...prev]);
    setCards((prev) => [newCard, ...prev]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCustomFront("");
    setCustomBack("");
    setShowAddModal(false);
  };

  const handleRemoveCard = useCallback((cardId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCards((prev) => {
      const nextCards = prev.filter((c) => c.id !== cardId);
      if (nextCards.length === 0) {
        setFinished(true);
      }
      return nextCards;
    });
    setCustomCards((prev) => prev.filter((c) => c.id !== cardId));
    setIsFlipped(false);
    setCurrentIndex((prev) => Math.max(0, Math.min(prev, cards.length - 2)));
  }, [cards.length]);

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    if (currentIndex >= cards.length - 1) {
      setFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [cards.length, currentIndex]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleShuffle = useCallback(() => {
    setCards((prev) => shuffle([...prev]));
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  const handleMastered = useCallback(() => {
    if (!currentCard || !activeLesson) return;
    setMasteredCount((prev) => prev + 1);
    record({
      lessonId: activeLesson.id,
      kind: "practice_attempt",
      label: `Mastered flashcard concept: ${currentCard.concept}`,
      score: 100,
      strongConcepts: [currentCard.concept],
      method: "reading",
      helped: true,
    });
    updateProgress(activeLesson.id, Math.min(100, activeLesson.progress + 2));
    handleNext();
  }, [activeLesson, currentCard, handleNext, record, updateProgress]);

  const handleStruggled = useCallback(() => {
    if (!currentCard || !activeLesson) return;
    setStruggledCards((prev) => [...prev, currentCard]);
    record({
      lessonId: activeLesson.id,
      kind: "practice_attempt",
      label: `Struggled with flashcard concept: ${currentCard.concept}`,
      score: 30,
      weakConcepts: [currentCard.concept],
      method: "reading",
      helped: false,
    });
    handleNext();
  }, [activeLesson, currentCard, handleNext, record]);

  if (loading || !activeLesson) {
    return (
      <Page>
        <PageHeading
          eyebrow="Flashcards"
          title="Loading active lesson..."
          description="Preparing your flashcard study deck."
        />
      </Page>
    );
  }

  if (finished || cards.length === 0) {
    return (
      <Page>
        <PageHeading
          eyebrow={`Flashcards · ${activeLesson.title}`}
          title="Deck Complete!"
          description="Great job reviewing your lesson flashcards."
        />
        <LessonBar current="practice" />

        <Panel className="mb-6 p-6 text-center space-y-4">
          <p className="text-5xl font-extrabold text-primary">{masteredCount} / {cards.length}</p>
          <p className="text-sm text-muted-foreground font-medium">
            Concepts Mastered in this study session
          </p>

          {struggledCards.length > 0 && (
            <div className="mt-4 rounded-xl bg-accent/10 p-4 border border-accent/30 text-left">
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">
                Concepts to Review (Weak Points Logged):
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-foreground">
                {struggledCards.map((c) => (
                  <li key={c.id}>
                    <strong>{c.concept}</strong> — {c.front}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleGoBack}
              className="rounded-xl bg-card px-4 py-2.5 text-sm font-medium ring-1 ring-border hover:bg-secondary"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={() => {
                setCards((prev) => shuffle([...prev]));
                setCurrentIndex(0);
                setIsFlipped(false);
                setMasteredCount(0);
                setStruggledCards([]);
                setFinished(false);
              }}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Study Again
            </button>
            <Link
              to="/progress"
              className="rounded-xl bg-card px-4 py-2.5 text-sm font-medium ring-1 ring-border hover:bg-secondary"
            >
              View Weak Points in Progress
            </Link>
          </div>
        </Panel>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeading
        eyebrow={`Flashcards · ${activeLesson.discipline}`}
        title={`${activeLesson.title} Flashcards`}
        description="Tap or click the card to reveal the answer. Track what you know and build concept mastery."
      />

      <LessonBar current="practice" />

      {/* Progress Counter & Actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="rounded-lg bg-surface px-3 py-1 font-medium ring-1 ring-border hover:bg-secondary text-foreground"
          >
            Go Back
          </button>
          <span>
            Card <strong>{currentIndex + 1}</strong> of <strong>{cards.length}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal((prev) => !prev)}
            className="rounded-lg bg-primary px-3 py-1 font-medium text-primary-foreground hover:opacity-90"
          >
            + Add Flashcard
          </button>
          <button
            type="button"
            onClick={handleShuffle}
            className="rounded-lg bg-surface px-3 py-1 font-medium ring-1 ring-border hover:bg-secondary"
          >
            Shuffle Deck
          </button>
        </div>
      </div>

      {/* Inline Form to Add Custom Flashcard */}
      {showAddModal && (
        <form onSubmit={handleAddFlashcard} className="mb-4 rounded-2xl bg-card p-4 ring-1 ring-border space-y-3">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Add Flashcard</p>
          <div>
            <label htmlFor="card-front" className="block text-xs font-medium text-muted-foreground mb-1">
              Front / Question
            </label>
            <input
              id="card-front"
              type="text"
              value={customFront}
              onChange={(e) => setCustomFront(e.target.value)}
              placeholder="e.g. What organelle stores genetic blueprints (DNA)?"
              className="w-full rounded-xl bg-surface px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="card-back" className="block text-xs font-medium text-muted-foreground mb-1">
              Back / Answer
            </label>
            <input
              id="card-back"
              type="text"
              value={customBack}
              onChange={(e) => setCustomBack(e.target.value)}
              placeholder="e.g. Nucleus"
              className="w-full rounded-xl bg-surface px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-primary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="rounded-lg bg-surface px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!customFront.trim() || !customBack.trim()}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              Save Flashcard
            </button>
          </div>
        </form>
      )}

      {/* Main Interactive Flashcard */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsFlipped((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
        }}
        className="relative cursor-pointer min-h-[260px] w-full select-none rounded-2xl bg-card p-6 ring-1 ring-border shadow-sm transition-colors flex flex-col justify-between outline-none focus:outline-none focus-visible:outline-none active:outline-none"
      >
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary">
            {currentCard.concept}
          </span>
          <div className="flex items-center gap-3">
            <span className="italic">{isFlipped ? "Back (Answer)" : "Front (Question)"}</span>
            <button
              type="button"
              onClick={(e) => handleRemoveCard(currentCard.id, e)}
              className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive ring-1 ring-destructive/20 hover:bg-destructive/20 outline-none focus:outline-none"
            >
              Remove Card
            </button>
          </div>
        </div>

        <div className="my-auto py-4 text-center">
          {!isFlipped ? (
            <h3 className="text-xl font-medium leading-relaxed text-pretty text-foreground select-none">
              {currentCard.front}
            </h3>
          ) : (
            <div className="space-y-2 select-none">
              <p className="text-lg font-medium leading-relaxed text-pretty text-primary">
                {currentCard.back}
              </p>
              <p className="text-xs text-muted-foreground italic">Source: {currentCard.source}</p>
            </div>
          )}
        </div>

        <div className="text-center pt-3 border-t border-border/50 text-xs text-muted-foreground select-none">
          {isFlipped ? "Click anywhere to see question" : "Click anywhere to reveal answer"}
        </div>
      </div>

      {/* Action Controls */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="rounded-xl bg-card px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-surface disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-xl bg-card px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-surface"
          >
            Next
          </button>
          <button
            type="button"
            onClick={(e) => handleRemoveCard(currentCard.id, e)}
            className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive ring-1 ring-destructive/20 hover:bg-destructive/20"
          >
            Remove Card
          </button>
        </div>

        {isFlipped && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleStruggled}
              className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive ring-1 ring-destructive/30 hover:bg-destructive/20"
            >
              Needs Practice
            </button>
            <button
              type="button"
              onClick={handleMastered}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground ring-1 ring-primary hover:opacity-90"
            >
              I Know This!
            </button>
          </div>
        )}
      </div>
    </Page>
  );
}
