# Figuro
Figuro is an AI-powered learning application that helps students understand topics, practice what they learned, identify weak points, and solve problems through guided support instead of simply receiving answers.


## Day 1 — Foundation

Day 1 focused on building the core foundation of the learning application.

Implemented:

User accounts and authentication
Account-level data isolation
Lessons and lesson progress
Subjects and folders
Study materials connected to lessons
AI Tutor connected to lesson context
Learn, Practice, Solve, and Progress workflows
My Materials Only / My Materials + Web source modes
Learner activity tracking
Weak-point and strength detection


## Day 2 — Testing, Fixing & Initial Quiz Work

Today focused on testing the existing Figuro learning experience and fixing issues found during testing.

### Completed

* Tested the AI Tutor and fixed the AI connection.
* Tested Learn with lesson-specific materials.
* Tested Practice and identified the repeated-question issue.
* Improved Practice to generate varied questions.
* Retested Practice with different questions.
* Tested Solve Together and confirmed step-by-step guidance.
* Tested Progress and confirmed weak-point detection.
* Added the initial Quiz route and Quiz navigation.
* Updated project documentation for Day 2.

### Current Result

Figuro can now provide personalized tutoring, varied practice activities, guided problem solving, learner progress tracking, and weak-point detection based on actual activity.


## Day 3 — Building the Brain

Day 3 focused on the AI and learning logic behind Figuro.

The current system includes:

AI Tutor using Gemini through the Lovable AI gateway
Lesson and study-material context passed into AI requests
AI-generated Practice activities
Practice grading with an understanding score
Weak and strong concept detection
Personalized learning recommendations
Step-by-step guided solving
Learner activity tracking used to personalize progress


## Day 4 – Practice Fix

Today I focused on improving Figuro’s hands-on practice experience.

### What I worked on

* Added the **Practice Fix** page
* Created a dedicated practice area for learners
* Improved the flow for identifying and correcting mistakes
* Continued refining Figuro’s learning experience and UI



# Day 5 — Practice & Application Testing

### Completed

* Improved the Practice experience.
* Added different practice questions and question types.
* Added scoring and feedback.
* Added hints and Try Again functionality.
* Connected practice results to learning progress and weak-point detection.
* Improved error handling and local fallback behavior.
* Tested the application and fixed issues found during testing.
* Kept the application working without external AI APIs or API keys.


# Day 6 — Multi-Agent System & Weak-Point Detection

### Completed

* Built a local multi-agent system for Figuro.
* Added Coordinator, Weak-Point, Lesson, Progress, and Action agents.
* Connected weak-point detection to quiz and practice results.
* Added active weak-point remediation with explanations, hints, and retesting.
* Improved Quiz and Practice question generation.
* Added filtering to prevent PDF metadata and copyright text from becoming questions.
* Kept the system local with no external AI APIs or API keys.
* Verified the project builds successfully with 0 errors.

### Day 7 — Solve Together & Repository Update

## Completed

* Improved Solve Together guided problem solving
* Added explicit side-question detection
* Side questions no longer get treated as answers
* Added clarification responses for learner questions
* Improved step-by-step progression
* Improved answer evaluation
* Preserved Go Back and step navigation
* Improved support for different subjects and learning topics
* Updated the GitHub repository with the latest Figuro changes

## Testing

* Tested correct answers
* Tested incorrect answers
* Tested side questions
* Tested moving between steps
* Tested subject-based learning context
* Verified the project builds successfully with 0 errors

## Status

Day 7 completed.



