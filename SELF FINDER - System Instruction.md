# System Instructions: SELF FINDER - Talent Assessment App

## Project Overview

Build a comprehensive Talent Assessment Application for evaluating users' learning modalities, multiple intelligences, and personality traits. The application operates on a dual-portal system: an Administration panel for test and token management, and a User portal accessed via secure tokens. The system features dynamic question shuffling, automated grading algorithms based on assessment types, and auto-generated printable reports.

---

## Navigation Structure

### Admin Navigation Tabs
- Dashboard (Analytics & Overview)
- Question Manager
- Token Management
- User Results & Reports
- Settings

### User Interface
- Token Login Page
- Assessment Portal (LITE, ELITE, or ULTIMATE view)
- Consultation Scheduling (ELITE & ULTIMATE only)
- Results & Report Viewer

---

## Admin Dashboard Page

### Key Metrics Section
- Active Tokens: Total tokens currently valid and in use.
- Completed Assessments: Total number of users who have finished the test.
- Tier Distribution: Breakdown of users in LITE, ELITE, and ULTIMATE tiers.

### Analytics Page
- Aggregate data showing the most common Modality and Personality types among all tested users.
- Usage tracking for generated tokens (e.g., "Token A: 42/45 uses").

---

## Assessment Management

### Question Manager
- Admin Privileges: Add, edit, or delete questions.
- Customizable Weights: Admin can set the point value per answer depending on the specific question.
- Categorization: Assign questions to specific assessments (Modality, Multiple Intelligence, Personality).

### Token Management
- Generation: Admin can generate access tokens either manually or automatically.
- Usage Limits: Tokens can be configured for single or multiple uses (e.g., setting a maximum cap of 45 or 100 users per token).
- Tier Assignment: Each generated token is linked to a specific plan (LITE, ELITE, or ULTIMATE).

---

## Assessment Rules & Tiers

### General Rules
- Anti-Guessing Measure: Every time an assessment is opened, all questions are randomly shuffled. The answer options within each question are also shuffled independently.

### Tier System
Users access different volumes of the assessment based on the token provided:
- LITE Tier: Contains a condensed questionnaire (10% - 20% of the total question bank).
- ELITE Tier: Contains a moderate questionnaire (50% - 70% of the total question bank). Includes access to a consultation session with professional staff.
- ULTIMATE Tier: Contains the comprehensive questionnaire (90% - 100% of the total question bank). Includes access to a consultation session with professional staff.

---

## Assessment Types & Grading Logic

### 1. Modality Assessment
- Categories: Visual, Auditory, Kinesthetic.
- Grading Rule: Likert Scale (0 to 4 points per answer).

### 2. Multiple Intelligence Assessment
- Categories: Linguistic, Logic-Mathematic, Spatial-Visual, Bodily-Kinesthetic, Musical, Interpersonal, Intrapersonal, Naturalist.
- Grading Rule: Likert Scale (0 to 4 points per answer).

### 3. Personality Assessment
- Categories: Sanguine, Choleric, Melancholy, Phlegmatic (Based on Galen / Personality Plus by Florence Littauer).
- Grading Rule: Binary Summation. If an option is checked/selected, it yields +1 point. Unchecked options yield 0 points.

---

## Core Functionalities

### Auto-Grading Engine
- The system will automatically calculate the final scores upon submission based on the specific grading rules of each category.
- Result Marking: The system will evaluate the highest scores to mark the user's dominant traits (e.g., "Your dominant Modality is Visual", "Your primary Intelligence is Logic-Mathematic").

### Automated Reporting & Printing
- The system automatically populates a pre-designed template with the user's specific results.
- Generates a polished, print-ready output (PDF format) directly from the application.

---

## Data Model

### Token
{
  "id": "string",
  "tokenString": "string",
  "maxUsage": "number",
  "currentUsage": "number",
  "tier": "LITE | ELITE | ULTIMATE",
  "createdAt": "timestamp"
}

### Question
{
  "id": "string",
  "assessmentType": "modality | intelligence | personality",
  "category": "string",
  "questionText": "string",
  "options": [
    {
      "text": "string",
      "points": "number"
    }
  ],
  "isActive": "boolean"
}

### Assessment Result
{
  "id": "string",
  "tokenId": "string",
  "tier": "string",
  "scores": {
    "modality": "object",
    "intelligence": "object",
    "personality": "object"
  },
  "finalMarking": "string",
  "pdfReportUrl": "string | null",
  "completedAt": "timestamp"
}

---

## Technical Requirements

### Architecture & Database
- Utilize a robust relational database (such as Supabase/PostgreSQL) to efficiently handle complex relationships between generated tokens, massive question banks, and user responses without data degradation.
- Ensure state management handles the shuffling of questions on the client side without losing track of the original question IDs for accurate server-side grading.

### Document Generation
- Implement a server-side PDF rendering library or service to take the raw JSON result data and inject it into the final visual template for the "Auto Print" feature.

### Security
- Ensure tokens are validated securely on the backend before granting access to the assessment endpoints.
- Prevent manual URL manipulation to access higher-tier questionnaires.