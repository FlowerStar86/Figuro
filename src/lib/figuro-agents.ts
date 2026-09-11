/**
 * Figuro Day 6 Multi-Agent System.
 * 
 * Local, deterministic multi-agent architecture built on top of Figuro's existing
 * data models and analytics. Requires NO external AI APIs, gateways, or API keys.
 * 
 * Agents:
 *  1. Weak-Point Agent  - Analyzes quiz/practice results to identify struggling concepts.
 *  2. Lesson Agent      - Analyzes current lesson metadata, topics, materials, and readiness.
 *  3. Progress Agent    - Analyzes progress scores, trends, attempt history, and learning methods.
 *  4. Action Agent      - Translates findings into a recommended next practice/study focus.
 *  5. Coordinator Agent - Orchestrates and synthesizes outputs from all sub-agents into a unified plan.
 */

import {
  type ActivityEvent,
  type WeakPoint,
  type StrongPoint,
  type MethodTendency,
  type Recommendation,
  detectWeakPoints,
  detectStrengths,
  methodTendencies,
  recommend,
} from "./figuro-activity";
import {
  type Lesson,
  type Material,
  type Folder,
  findLesson,
  lessonContent,
} from "./figuro-lessons";
import { type Topic, findTopic } from "./figuro-data";

/** Standardized input payload for the multi-agent system. */
export type MultiAgentInput = {
  lessons: Lesson[];
  events: ActivityEvent[];
  materials?: Material[];
  folders?: Folder[];
  currentLessonId?: string | null;
  practice?: Record<string, { prompt: string; hints: string[]; concepts: string[] }>;
};

/* ========================================================================== */
/* 1. Weak-Point Agent                                                        */
/* ========================================================================== */

export type WeakPointAgentOutput = {
  agentName: "WeakPointAgent";
  weakPoints: WeakPoint[];
  strongPoints: StrongPoint[];
  targetLessonWeakPoints: WeakPoint[];
  primaryStruggleConcept: string | null;
  struggleSeverity: "critical" | "moderate" | "low" | "none";
  summary: string;
};

export function analyzeWeakPoints(input: MultiAgentInput): WeakPointAgentOutput {
  const events = input.events ?? [];
  const allWeakPoints = detectWeakPoints(events);
  const allStrongPoints = detectStrengths(events);

  const currentLessonId = input.currentLessonId;
  const targetLessonWeakPoints = currentLessonId
    ? allWeakPoints.filter((w) => w.lessonId === currentLessonId)
    : allWeakPoints;

  const primary = allWeakPoints[0] ?? null;
  const primaryConcept = primary ? primary.concept : null;

  let struggleSeverity: WeakPointAgentOutput["struggleSeverity"] = "none";
  if (primary) {
    if (primary.signals >= 4) struggleSeverity = "critical";
    else if (primary.signals >= 2) struggleSeverity = "moderate";
    else struggleSeverity = "low";
  }

  let summary = "";
  if (allWeakPoints.length === 0) {
    summary = "No significant weak points detected. Practice results demonstrate good baseline comprehension.";
  } else {
    const topConcepts = allWeakPoints.slice(0, 3).map((w) => `"${w.concept}" (${w.signals} signals)`).join(", ");
    summary = `Identified ${allWeakPoints.length} struggle area(s). Top focus: ${topConcepts}. Severity: ${struggleSeverity}.`;
  }

  return {
    agentName: "WeakPointAgent",
    weakPoints: allWeakPoints,
    strongPoints: allStrongPoints,
    targetLessonWeakPoints,
    primaryStruggleConcept: primaryConcept,
    struggleSeverity,
    summary,
  };
}

export const weakPointAgent = {
  name: "Weak-Point Agent" as const,
  description: "Analyzes quiz/practice results and identifies concepts the learner struggles with.",
  analyze: analyzeWeakPoints,
};

/* ========================================================================== */
/* 2. Lesson Agent                                                            */
/* ========================================================================== */

export type LessonAgentOutput = {
  agentName: "LessonAgent";
  currentLesson: Lesson | null;
  topic: Topic | null;
  concepts: string[];
  checkpoints: string[];
  materialsSummary: {
    total: number;
    extractedCount: number;
    unreadableCount: number;
    byKind: Record<string, number>;
  };
  readinessStatus: "ready" | "needs_materials" | "no_lesson";
  summary: string;
};

export function analyzeLesson(input: MultiAgentInput): LessonAgentOutput {
  const currentLesson = findLesson(input.lessons ?? [], input.currentLessonId);

  if (!currentLesson) {
    return {
      agentName: "LessonAgent",
      currentLesson: null,
      topic: null,
      concepts: [],
      checkpoints: [],
      materialsSummary: { total: 0, extractedCount: 0, unreadableCount: 0, byKind: {} },
      readinessStatus: "no_lesson",
      summary: "No active lesson found to analyze.",
    };
  }

  // Retrieve topic info from predefined topics or generic scaffolded lesson content
  const topicData = findTopic(currentLesson.id) ?? lessonContent(currentLesson);
  const checkpoints = topicData.checkpoints ?? [];

  // Extract concepts from practice or topic
  const practiceConcepts = input.practice?.[currentLesson.id]?.concepts ?? [];
  const concepts = Array.from(
    new Set([
      currentLesson.title,
      currentLesson.discipline,
      ...practiceConcepts,
      ...(topicData.summary ? [topicData.summary] : []),
    ]),
  );

  // Analyze lesson materials
  const lessonMaterials = (input.materials ?? []).filter(
    (m) => m.lessonId === currentLesson.id,
  );

  const byKind: Record<string, number> = {};
  let extractedCount = 0;
  let unreadableCount = 0;

  for (const mat of lessonMaterials) {
    byKind[mat.kind] = (byKind[mat.kind] ?? 0) + 1;
    if (mat.extracted || (mat.content && mat.content.trim().length > 0)) {
      extractedCount += 1;
    } else {
      unreadableCount += 1;
    }
  }

  const totalMaterials = lessonMaterials.length;
  let readinessStatus: LessonAgentOutput["readinessStatus"] = "ready";
  if (totalMaterials === 0 && currentLesson.progress < 20) {
    readinessStatus = "needs_materials";
  }

  const summary = `Lesson "${currentLesson.title}" (${currentLesson.discipline}): ${currentLesson.progress}% progress, ${totalMaterials} material(s) attached (${extractedCount} readable). Readiness: ${readinessStatus}.`;

  return {
    agentName: "LessonAgent",
    currentLesson,
    topic: topicData,
    concepts,
    checkpoints,
    materialsSummary: {
      total: totalMaterials,
      extractedCount,
      unreadableCount,
      byKind,
    },
    readinessStatus,
    summary,
  };
}

export const lessonAgent = {
  name: "Lesson Agent" as const,
  description: "Analyzes the current lesson and its concepts/materials.",
  analyze: analyzeLesson,
};

/* ========================================================================== */
/* 3. Progress Agent                                                          */
/* ========================================================================== */

export type ProgressAgentOutput = {
  agentName: "ProgressAgent";
  totalAttempts: number;
  averageScore: number | null;
  trend: "improving" | "stable" | "declining" | "insufficient_data";
  lessonsCompletedCount: number;
  totalLessonsCount: number;
  averageLessonProgress: number;
  effectiveMethods: MethodTendency[];
  summary: string;
};

export function analyzeProgress(input: MultiAgentInput): ProgressAgentOutput {
  const events = input.events ?? [];
  const lessons = input.lessons ?? [];

  const gradedEvents = events.filter(
    (e) => e.kind === "practice_attempt" && typeof e.score === "number",
  );

  const totalAttempts = gradedEvents.length;
  let averageScore: number | null = null;
  let trend: ProgressAgentOutput["trend"] = "insufficient_data";

  if (totalAttempts > 0) {
    const scores = gradedEvents.map((e) => e.score!);
    const sum = scores.reduce((acc, val) => acc + val, 0);
    averageScore = Math.round(sum / totalAttempts);

    if (totalAttempts >= 3) {
      const half = Math.floor(totalAttempts / 2);
      const earlierScores = scores.slice(0, half);
      const recentScores = scores.slice(half);

      const earlierAvg = earlierScores.reduce((a, b) => a + b, 0) / earlierScores.length;
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

      const diff = recentAvg - earlierAvg;
      if (diff >= 5) trend = "improving";
      else if (diff <= -5) trend = "declining";
      else trend = "stable";
    }
  }

  const totalLessonsCount = lessons.length;
  const lessonsCompletedCount = lessons.filter((l) => l.progress >= 100).length;
  const totalProgressSum = lessons.reduce((acc, l) => acc + l.progress, 0);
  const averageLessonProgress =
    totalLessonsCount > 0 ? Math.round(totalProgressSum / totalLessonsCount) : 0;

  const effectiveMethods = methodTendencies(events);

  let summary = "";
  if (totalAttempts === 0) {
    summary = `Progress tracking initialized across ${totalLessonsCount} lesson(s). Average progress is ${averageLessonProgress}%. No practice attempts recorded yet.`;
  } else {
    summary = `${totalAttempts} practice attempt(s) recorded with average score of ${averageScore}%. Performance trend is ${trend}. ${lessonsCompletedCount}/${totalLessonsCount} lessons completed.`;
  }

  return {
    agentName: "ProgressAgent",
    totalAttempts,
    averageScore,
    trend,
    lessonsCompletedCount,
    totalLessonsCount,
    averageLessonProgress,
    effectiveMethods,
    summary,
  };
}

export const progressAgent = {
  name: "Progress Agent" as const,
  description: "Analyzes progress, scores, attempts, and improvement.",
  analyze: analyzeProgress,
};

/* ========================================================================== */
/* 4. Action Agent                                                            */
/* ========================================================================== */

export type ActionAgentOutput = {
  agentName: "ActionAgent";
  recommendation: Recommendation;
  targetLessonId: string;
  targetConcept: string | null;
  suggestedRoute: "/learn" | "/practice" | "/solve";
  actionTitle: string;
  rationale: string;
  actionSteps: string[];
  summary: string;
};

export function recommendAction(
  input: MultiAgentInput,
  weakPointOut?: WeakPointAgentOutput,
  lessonOut?: LessonAgentOutput,
  progressOut?: ProgressAgentOutput,
): ActionAgentOutput {
  const events = input.events ?? [];
  const lessons = input.lessons ?? [];

  // Use Figuro's existing recommendation heuristic as baseline
  const rec = recommend(events, lessons);

  const weakPointResult = weakPointOut ?? analyzeWeakPoints(input);
  const lessonResult = lessonOut ?? analyzeLesson(input);
  const progressResult = progressOut ?? analyzeProgress(input);

  let suggestedRoute = rec.to;
  let targetLessonId = rec.lessonId;
  let targetConcept = weakPointResult.primaryStruggleConcept;
  let actionTitle = rec.title;
  let rationale = rec.reason;
  const actionSteps: string[] = [];

  if (weakPointResult.struggleSeverity === "critical" && weakPointResult.weakPoints[0]) {
    const primaryWeak = weakPointResult.weakPoints[0];
    suggestedRoute = "/practice";
    targetLessonId = primaryWeak.lessonId;
    actionTitle = `Targeted Practice: ${primaryWeak.concept}`;
    rationale = `Critical struggle detected in ${primaryWeak.concept} (${primaryWeak.reasons.join(", ")}). Focused practice needed.`;
    actionSteps.push(`Review key notes or checkpoints for "${primaryWeak.concept}".`);
    actionSteps.push(`Attempt 1-2 targeted practice exercises on /practice.`);
    actionSteps.push(`Use hints progressively if blocked.`);
  } else if (lessonResult.readinessStatus === "needs_materials" && lessonResult.currentLesson) {
    suggestedRoute = "/learn";
    targetLessonId = lessonResult.currentLesson.id;
    actionTitle = `Add Materials for ${lessonResult.currentLesson.title}`;
    rationale = `Lesson has 0 materials attached. Adding notes or text will improve tutor context and practice quality.`;
    actionSteps.push(`Go to /learn and open "${lessonResult.currentLesson.title}".`);
    actionSteps.push(`Paste study notes, links, or upload reference files.`);
    actionSteps.push(`Ask the tutor to summarize the key concepts.`);
  } else if (progressResult.trend === "improving") {
    actionSteps.push(`Maintain current learning momentum.`);
    actionSteps.push(`Challenge yourself with a new practice problem.`);
  } else {
    actionSteps.push(`Review checkpoints on /learn.`);
    actionSteps.push(`Complete one practice session on /practice.`);
  }

  const summary = `Action Agent recommends [${suggestedRoute}]: "${actionTitle}". ${rationale}`;

  return {
    agentName: "ActionAgent",
    recommendation: rec,
    targetLessonId,
    targetConcept,
    suggestedRoute,
    actionTitle,
    rationale,
    actionSteps,
    summary,
  };
}

export const actionAgent = {
  name: "Action Agent" as const,
  description: "Turns the findings into a recommended next practice focus.",
  analyze: recommendAction,
};

/* ========================================================================== */
/* 5. Coordinator Agent                                                       */
/* ========================================================================== */

export type MultiAgentSynthesis = {
  agentOutputs: {
    weakPoint: WeakPointAgentOutput;
    lesson: LessonAgentOutput;
    progress: ProgressAgentOutput;
    action: ActionAgentOutput;
  };
  overallHeadline: string;
  unifiedAdvice: string;
  prioritizedNextSteps: string[];
  timestamp: number;
};

export function coordinateAgents(input: MultiAgentInput): MultiAgentSynthesis {
  // Execute sub-agents independently
  const weakPointRes = analyzeWeakPoints(input);
  const lessonRes = analyzeLesson(input);
  const progressRes = analyzeProgress(input);
  const actionRes = recommendAction(input, weakPointRes, lessonRes, progressRes);

  // Combine and synthesize findings into a unified multi-agent output
  let overallHeadline = "";
  if (weakPointRes.struggleSeverity === "critical") {
    overallHeadline = `Attention Needed: Focus on ${weakPointRes.primaryStruggleConcept ?? "Weak Points"}`;
  } else if (progressRes.trend === "improving") {
    overallHeadline = `Great Progress! Ready for Advanced Practice`;
  } else if (lessonRes.currentLesson) {
    overallHeadline = `Current Focus: ${lessonRes.currentLesson.title}`;
  } else {
    overallHeadline = `Multi-Agent Learning Assessment Ready`;
  }

  const adviceParts: string[] = [];
  adviceParts.push(progressRes.summary);
  adviceParts.push(lessonRes.summary);
  adviceParts.push(weakPointRes.summary);
  adviceParts.push(actionRes.summary);

  const unifiedAdvice = adviceParts.join(" ");

  const prioritizedNextSteps = [
    actionRes.actionTitle,
    ...actionRes.actionSteps,
  ];

  return {
    agentOutputs: {
      weakPoint: weakPointRes,
      lesson: lessonRes,
      progress: progressRes,
      action: actionRes,
    },
    overallHeadline,
    unifiedAdvice,
    prioritizedNextSteps,
    timestamp: Date.now(),
  };
}

export const coordinatorAgent = {
  name: "Coordinator Agent" as const,
  description: "Combines the outputs from all other agents into a unified synthesis.",
  coordinate: coordinateAgents,
};

/** High-level facade function to invoke Figuro's Day 6 multi-agent system. */
export function runMultiAgentSystem(input: MultiAgentInput): MultiAgentSynthesis {
  return coordinatorAgent.coordinate(input);
}
