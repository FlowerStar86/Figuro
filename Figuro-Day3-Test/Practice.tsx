import { useState } from "react";
import "./App.css";

type PracticeQuestion = {
  question: string;
  options: string[];
  answer: string;
  concept: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

const practiceQuestions: PracticeQuestion[] = [
  {
    question: "What is the main function of the cell membrane?",
    options: [
      "It controls what enters and leaves the cell",
      "It produces DNA",
      "It makes proteins",
      "It produces sunlight",
    ],
    answer: "It controls what enters and leaves the cell",
    concept: "Cell membrane",
    difficulty: "Easy",
  },
  {
    question: "What organelle produces ATP for the cell?",
    options: [
      "Nucleus",
      "Mitochondria",
      "Ribosome",
      "Golgi apparatus",
    ],
    answer: "Mitochondria",
    concept: "Cell organelles",
    difficulty: "Easy",
  },
  {
    question: "What is osmosis?",
    options: [
      "Movement of water across a selectively permeable membrane",
      "Production of proteins",
      "Movement of DNA into the nucleus",
      "Production of ATP",
    ],
    answer: "Movement of water across a selectively permeable membrane",
    concept: "Osmosis",
    difficulty: "Medium",
  },
  {
    question: "What happens to an animal cell in a hypertonic solution?",
    options: [
      "It loses water and shrinks",
      "It gains water and bursts",
      "Nothing happens",
      "It starts photosynthesis",
    ],
    answer: "It loses water and shrinks",
    concept: "Osmosis",
    difficulty: "Medium",
  },
  {
    question: "Which process requires energy to move substances against their concentration gradient?",
    options: [
      "Diffusion",
      "Osmosis",
      "Active transport",
      "Passive transport",
    ],
    answer: "Active transport",
    concept: "Cell transport",
    difficulty: "Hard",
  },
];

function Practice() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = practiceQuestions[currentIndex];

  const isCorrect = selectedAnswer === currentQuestion.answer;

  function submitAnswer() {
    if (!selectedAnswer) return;
    setSubmitted(true);
  }

  function nextQuestion() {
    if (currentIndex < practiceQuestions.length - 1) {
      setCurrentIndex((value) => value + 1);
      setSelectedAnswer("");
      setSubmitted(false);
    }
  }

  function restartPractice() {
    setCurrentIndex(0);
    setSelectedAnswer("");
    setSubmitted(false);
  }

  const finished = currentIndex === practiceQuestions.length - 1 && submitted;

  if (finished) {
    return (
      <main className="page">
        <div className="card result-card">
          <div className="brand">FIGURO</div>

          <h1>Practice Complete 🌿</h1>

          <p className="subtitle">
            You finished this practice session.
          </p>

          <button
            className="button primary"
            onClick={restartPractice}
          >
            Practice Again
          </button>
        </div>
      </main>
    );
  }

  const progress =
    ((currentIndex + 1) / practiceQuestions.length) * 100;

  return (
    <main className="page">
      <div className="quiz-container">
        <header className="header">
          <div className="brand">FIGURO · PRACTICE</div>

          <h1>Let's practice 🌱</h1>

          <p className="subtitle">
            Question {currentIndex + 1} of{" "}
            {practiceQuestions.length}
          </p>
        </header>

        <div className="progress-track">
          <div
            className="progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="card">
          <div className="question-meta">
            <span className="difficulty">
              {currentQuestion.difficulty}
            </span>

            <span className="concept">
              {currentQuestion.concept}
            </span>
          </div>

          <h2>{currentQuestion.question}</h2>

          <div className="answers">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                className={
                  selectedAnswer === option
                    ? "answer selected"
                    : "answer"
                }
                onClick={() => setSelectedAnswer(option)}
                disabled={submitted}
              >
                {option}
              </button>
            ))}
          </div>

          {submitted && (
            <div
              className={
                isCorrect
                  ? "feedback correct"
                  : "feedback incorrect"
              }
            >
              <strong>
                {isCorrect ? "Correct! 🌿" : "Not quite."}
              </strong>

              {!isCorrect && (
                <p>
                  Correct answer:{" "}
                  <strong>{currentQuestion.answer}</strong>
                </p>
              )}
            </div>
          )}

          <div className="actions">
            {!submitted ? (
              <button
                className="button primary"
                onClick={submitAnswer}
                disabled={!selectedAnswer}
              >
                Check Answer
              </button>
            ) : (
              <button
                className="button secondary"
                onClick={nextQuestion}
              >
                Next Question →
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Practice;