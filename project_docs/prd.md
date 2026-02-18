Building an MVP (Minimum Viable Product) for **Axomprep** with a focus on **General Science** for the SEBA/AHSEC boards is a strategic masterstroke. By narrowing your scope, you can ensure your AI "Pocket Coach" is accurate and deeply localized before scaling.

---

# **Axomprep MVP: General Science Edition**

## **1. Product Overview**

**The Hook:** "Your 24/7 Science Teacher for the Assam Board."
**Goal:** Solve the "11 PM doubt" for Class 10/12 students while providing high-probability exam content in Assamese and English.

---

## **2. MVP Feature Set**

### **A. Multimodal Doubt Solver (The "Snap-Solve" Engine)**

* **The Problem:** Students get stuck on diagrams or numericals (Light, Electricity) and have no one to ask at night.
* **The MVP Solution:** A simple upload button.
* **Image Input:** Student takes a photo of a textbook question or a handwritten numerical.
* **AI Logic:** Gemini 1.5 Flash (for speed/cost) extracts the text and solves it.
* **The Bridge:** The solution is provided in **English** (for the exam paper) and an **Assamese Voice Note** (to explain the "why" behind the steps).



### **B. The "Last-Mile" Suggester**

* **The Goal:** Drive traffic to `axomprep.in` during exam season (Feb-March).
* **The Content:** AI-generated "Most Probable Questions" for the upcoming Science exam.
* *Example:* "List 10 must-know ray diagrams for the Light chapter."
* *Example:* "20 Assertion-Reasoning questions for Life Processes."



### **C. 50% OMR Practice Engine**

* **The Context:** SEBA 2026 has a 50% MCQ (OMR) pattern.
* **The Feature:** A "Rapid Fire" quiz mode. 10 questions, 5 minutes. Instant result with Assamese explanations for wrong answers.

---

## **3. Gamification (The "MVP" Version)**

Keep it simple. Don't build a complex RPG yet. Focus on "Habit" and "Status."

| Mechanic | Name in Axomprep | Purpose |
| --- | --- | --- |
| **Streaks** | **"Sadhana" Streak** | A flame icon that grows every day a student solves at least 1 doubt. Breaking it feels like a loss. |
| **Badges** | **"Sikshak" Badges** | Earned for specific milestones: <br>

<br>• *Newton's Peer:* Solved 5 Physics numericals. <br>

<br>• *Bio Wizard:* Mastered the 'Life Processes' quiz. |
| **Leaderboard** | **District Rankings** | "Top 10 in Kamrup Metro." Taps into local pride and healthy competition. |
| **Leveling Up** | **Knowledge Rank** | Progress bar from "Beginner" to "Vishwa-Sikshak" (Global Teacher) based on points earned. |

---

## **4. Strategic Implementation (The 2-Week Plan)**

* **Week 1 (Data & AI):** Use **Puppeteer** to scrape previous year SEBA Science papers. Feed them into a Vector Database so your AI "knows" exactly how SEBA asks questions.
* **Week 2 (Frontend & Launch):** Set up a simple Next.js page on `axomprep.in`.
* **Home:** "Science Exam Feb 23: Get your AI Suggestion."
* **The App:** Simple login -> Camera icon -> AI Answer.



---

## **5. Success Metrics for MVP**

* **Engagement:** Average doubts solved per user (Target: 3/day).
* **Retention:** 3-day streak completion (Target: 40% of users).
* **Viral Factor:** Number of times a student shares an AI-generated infographic on their WhatsApp status.

### **The "Brutal" Summary**

Don't worry about "Skill Trees" or "Marketplaces" yet. If your app can solve a complex **Electricity numerical** in 5 seconds and explain it in **Assamese voice**, you have already beaten every other competitor in the region.

**Would you like me to generate the "System Prompt" for your AI Science Coach that specifically knows the SEBA 2026 marking scheme?**

[Gamification in Education: How to Use It (With Examples)](https://www.openlms.net/blog/insights/gamification-in-education-how-to-use-with-examples/)

This video is helpful because it explains how to practically apply gamification mechanics like points and streaks to educational apps to increase student engagement, which is the core goal of your Axomprep MVP.