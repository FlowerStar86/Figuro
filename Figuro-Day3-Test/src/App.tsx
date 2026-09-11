import { useMemo, useState } from "react";
import "./App.css";

type QuestionType =
  | "multiple-choice"
  | "true-false"
  | "short-answer"
  | "fill-blank";

type Difficulty = "Easy" | "Medium" | "Hard";

type Question = {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string;
  concept: string;
  difficulty: Difficulty;
  sourceText: string;
};

type Result = {
  question: Question;
  userAnswer: string;
  correct: boolean;
};

const STOP_WORDS = new Set([
  "this",
  "that",
  "with",
  "from",
  "they",
  "their",
  "there",
  "which",
  "where",
  "when",
  "what",
  "about",
  "these",
  "those",
  "into",
  "than",
  "then",
  "have",
  "will",
  "would",
  "could",
  "should",
  "because",
  "while",
  "during",
  "after",
  "before",
  "also",
  "only",
  "very",
  "more",
  "most",
  "some",
  "such",
  "used",
  "using",
  "each",
  "both",
  "other",
  "another",
  "their",
  "being",
  "been",
  "were",
  "was",
  "are",
  "is",
  "the",
  "and",
  "for",
  "not",
  "but",
  "you",
  "your",
  "its",
  "how",
  "why",
  "can",
  "may",
  "has",
  "had",
  "does",
  "did",
]);

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, " ");
}

function splitMaterial(materials: string): string[] {
  return materials
    .split(/\n+|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 25);
}

function getKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 5 &&
        !STOP_WORDS.has(word) &&
        !/^\d+$/.test(word),
    );

  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 30);
}

function pickKeyword(sentence: string, allKeywords: string[]): string {
  const sentenceWords = new Set(
    sentence
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/),
  );

  return (
    allKeywords.find((keyword) => sentenceWords.has(keyword)) ??
    allKeywords[0] ??
    "concept"
  );
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function makeWrongOptions(
  correct: string,
  keywords: string[],
  sentence: string,
): string[] {
  const alternatives = keywords
    .filter((word) => normalize(word) !== normalize(correct))
    .filter((word) => !sentence.toLowerCase().includes(word))
    .slice(0, 8);

  const padded = [...alternatives];

  while (padded.length < 3) {
    padded.push(`another concept from ${correct}`);
  }

  return shuffle([correct, ...padded.slice(0, 3)]);
}

function createQuestions(subject: string, materials: string): Question[] {
  const sentences = splitMaterial(materials);

  if (sentences.length === 0) {
    return [];
  }

  const keywords = getKeywords(materials);
  const output: Question[] = [];

   const sourceSentences = shuffle(sentences);

  sourceSentences.forEach((sentence, index) => {
    const keyword = pickKeyword(sentence, keywords);
   
    const sentenceWithoutKeyword = sentence.replace(
      new RegExp(`\\b${keyword}\\b`, "i"),
      "_____",
    );

    // 1. Fill in the blank
    output.push({
      id: `fill-${index}-${keyword}`,
      type: "fill-blank",
      question: `Complete the statement from your ${subject} materials: ${sentenceWithoutKeyword}`,
      answer: keyword,
      concept: keyword,
      difficulty: "Easy",
      sourceText: sentence,
    });

    // 2. True / False
    const isLongSentence = sentence.length > 80;

    output.push({
      id: `tf-${index}-${keyword}`,
      type: "true-false",
      question: `True or False: According to your materials, ${sentence}`,
      answer: "True",
      concept: keyword,
      difficulty: isLongSentence ? "Medium" : "Easy",
      sourceText: sentence,
    });

    // 3. Multiple choice
    const options = makeWrongOptions(keyword, keywords, sentence);

    output.push({
      id: `mc-${index}-${keyword}`,
      type: "multiple-choice",
      question: `Which concept is being described in this part of your ${subject} materials?\n\n"${sentence}"`,
      options,
      answer: keyword,
      concept: keyword,
      difficulty: "Medium",
      sourceText: sentence,
    });

    // 4. Short answer
    output.push({
      id: `short-${index}-${keyword}`,
      type: "short-answer",
      question: `In your own words, explain what this statement means:\n\n"${sentence}"`,
      answer: sentence,
      concept: keyword,
      difficulty: "Hard",
      sourceText: sentence,
    });
  });

  return shuffle(output);
}

function answerMatches(question: Question, userAnswer: string): boolean {
  const user = normalize(userAnswer);

  if (!user) {
    return false;
  }

  if (question.type === "true-false") {
    return user === normalize(question.answer);
  }

  if (question.type === "fill-blank") {
    return (
      user === normalize(question.answer) ||
      user.includes(normalize(question.answer))
    );
  }

  if (question.type === "multiple-choice") {
    return user === normalize(question.answer);
  }


  const importantWords = getKeywords(question.answer).slice(0, 3);

  if (importantWords.length === 0) {
    return user.length >= 15;
  }

  const matches = importantWords.filter((word) =>
    user.includes(word),
  ).length;

  return matches >= Math.ceil(importantWords.length / 2);
}

function App() {
  const [subject, setSubject] = useState("");
  const [materials, setMaterials] = useState("");
  const [questionCount, setQuestionCount] = useState(5);

  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [results, setResults] = useState<Result[]>([]);
  const [finished, setFinished] = useState(false);

  const [error, setError] = useState("");

  const sourceQuestionCount = useMemo(
    () => splitMaterial(materials).length * 4,
    [materials],
  );

  const currentQuestion = questions[currentIndex];

  function startQuiz() {
    setError("");

    const cleanSubject = subject.trim();
    const cleanMaterials = materials.trim();

    if (!cleanSubject) {
      setError("Enter the subject first.");
      return;
    }

    if (!cleanMaterials) {
      setError("Paste the student's study materials first.");
      return;
    }

    const generated = createQuestions(cleanSubject, cleanMaterials);

    if (generated.length === 0) {
      setError(
        "I couldn't find enough readable material. Add more notes or text.",
      );
      return;
    }

    const selected = generated.slice(
      0,
      Math.min(questionCount, generated.length),
    );

    setQuestions(selected);
    setCurrentIndex(0);
    setCurrentAnswer("");
    setSubmitted(false);
    setResults([]);
    setFinished(false);
    setQuizStarted(true);
  }

  function submitAnswer() {
    if (!currentQuestion || !currentAnswer.trim() || submitted) {
      return;
    }

    const correct = answerMatches(
      currentQuestion,
      currentAnswer,
    );

    setResults((previous) => [
      ...previous,
      {
        question: currentQuestion,
        userAnswer: currentAnswer,
        correct,
      },
    ]);

    setSubmitted(true);
  }

  function nextQuestion() {
    if (currentIndex >= questions.length - 1) {
      setFinished(true);
      return;
    }

    setCurrentIndex((previous) => previous + 1);
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

  if (!quizStarted) {
    return (
      <main className="page">
        <div className="setup-container">
          <header className="header">
            <div className="brand">FIGURO</div>

            <h1>Build a quiz from your materials 🌱</h1>

            <p className="subtitle">
              The quiz will use the subject and study material you provide.
            </p>
          </header>

          <section className="card setup-card">
            <label htmlFor="subject">Subject / Lesson</label>

            <input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Example: Cell Biology"
            />

            <label htmlFor="materials">Student materials</label>

            <textarea
              id="materials"
              rows={14}
              value={materials}
              onChange={(event) =>
                setMaterials(event.target.value)
              }
              placeholder={`Paste the student's notes here.

Example:
The nucleus contains the cell's genetic material.
Mitochondria produce ATP through cellular respiration.
The Golgi apparatus modifies and packages proteins.
...`}
            />

            <div className="material-info">
              Approximate source statements detected:{" "}
              <strong>{sourceQuestionCount}</strong> possible questions
            </div>

            <label htmlFor="question-count">
              Number of questions
            </label>

            <select
              id="question-count"
              value={questionCount}
              onChange={(event) =>
                setQuestionCount(Number(event.target.value))
              }
            >
              <option value={5}>5 questions</option>
              <option value={10}>10 questions</option>
              <option value={15}>15 questions</option>
            </select>

            {error && <div className="error">{error}</div>}

            <button
              type="button"
              className="button primary full-width"
              onClick={startQuiz}
            >
              Start Quiz
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (finished) {
    const correctCount = results.filter(
      (result) => result.correct,
    ).length;

    const percentage =
      results.length === 0
        ? 0
        : Math.round((correctCount / results.length) * 100);

    const weakConcepts = new Map<string, number>();

    results.forEach((result) => {
      if (!result.correct) {
        weakConcepts.set(
          result.question.concept,
          (weakConcepts.get(result.question.concept) ?? 0) + 1,
        );
      }
    });

    const weakList = [...weakConcepts.entries()].sort(
      (a, b) => b[1] - a[1],
    );

    return (
      <main className="page">
        <div className="quiz-container">
          <section className="card result-card">
            <div className="brand">FIGURO</div>

            <h1>Quiz Complete 🌿</h1>

            <p className="subject-result">{subject}</p>

            <div className="result-score">
              {percentage}%
            </div>

            <p className="result-summary">
              {correctCount} of {results.length} questions correct.
            </p>

            <div className="result-section">
              <h2>Weak points</h2>

              {weakList.length === 0 ? (
                <p>
                  No weak concepts were detected from this quiz.
                </p>
              ) : (
                <div className="weak-list">
                  {weakList.map(([concept, count]) => (
                    <div className="weak-item" key={concept}>
                      <strong>{concept}</strong>
                      <span>
                        {count} incorrect{" "}
                        {count === 1 ? "answer" : "answers"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="button primary"
              onClick={restart}
            >
              Quiz Again
              
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const progress =
    ((currentIndex + 1) / questions.length) * 100;

  const correct =
    submitted &&
    answerMatches(currentQuestion, currentAnswer);

  return (
    <main className="page">
      <div className="quiz-container">
        <header className="header">
          <div className="brand">FIGURO · QUIZ</div>

          <h1>{subject}</h1>

          <p className="subtitle">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </header>

        <div
          className="progress-track"
          aria-label={`Question ${currentIndex + 1} of ${questions.length}`}
        >
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

          <h2>
            {currentQuestion.question
              .split("\n")
              .map((line, index) => (
                <span key={`${line}-${index}`}>
                  {line}
                  {index <
                    currentQuestion.question.split("\n").length -
                      1 && <br />}
                </span>
              ))}
          </h2>

          <div className="answers">
            {currentQuestion.type === "multiple-choice" &&
              currentQuestion.options?.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={
                    currentAnswer === option
                      ? "answer selected"
                      : "answer"
                  }
                  onClick={() => setCurrentAnswer(option)}
                  disabled={submitted}
                >
                  {option}
                </button>
              ))}

            {currentQuestion.type === "true-false" && (
              <>
                <button
                  type="button"
                  className={
                    currentAnswer === "True"
                      ? "answer selected"
                      : "answer"
                  }
                  onClick={() => setCurrentAnswer("True")}
                  disabled={submitted}
                >
                  True
                </button>

                <button
                  type="button"
                  className={
                    currentAnswer === "False"
                      ? "answer selected"
                      : "answer"
                  }
                  onClick={() => setCurrentAnswer("False")}
                  disabled={submitted}
                >
                  False
                </button>
              </>
            )}

            {(currentQuestion.type === "short-answer" ||
              currentQuestion.type === "fill-blank") && (
              <textarea
                rows={5}
                value={currentAnswer}
                onChange={(event) =>
                  setCurrentAnswer(event.target.value)
                }
                disabled={submitted}
                placeholder={
                  currentQuestion.type === "fill-blank"
                    ? "Type the missing concept..."
                    : "Explain in your own words..."
                }
              />
            )}
          </div>

          {submitted && (
            <div
              className={
                correct
                  ? "feedback correct"
                  : "feedback incorrect"
              }
            >
              <strong>
                {correct ? "Correct! 🎉" : "Not quite."}
              </strong>

              <p>
                {correct
                  ? "Your answer matches the information from the supplied materials."
                  : `Review this concept: ${currentQuestion.concept}`}
              </p>

              <details>
                <summary>Show source from materials</summary>
                <p>{currentQuestion.sourceText}</p>
              </details>
            </div>
          )}

          <div className="actions">
            {!submitted ? (
              <button
                type="button"
                className="button primary"
                onClick={submitAnswer}
                disabled={!currentAnswer.trim()}
              >
                Submit Answer
              </button>
            ) : (
              <button
                type="button"
                className="button secondary"
                onClick={nextQuestion}
              >
                {currentIndex === questions.length - 1
                  ? "See Results"
                  : "Next Question →"}
              </button>
            )}
          </div>
        </section>

        <button
          type="button"
          className="exit-button"
          onClick={restart}
        >
          Exit Quiz
        </button>
      </div>
    </main>
  );
}

export default App;