"use client";

import { LegalWrapper } from "@/components/LegalWrapper";

export default function TermsPage() {
  return (
    <LegalWrapper title="Terms of Service" lastUpdated="February 19, 2026">
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing Axomprep, you agree to be bound by these terms. Our software provides AI-driven 
        educational support specifically designed for students in Assam.
      </p>

      <h2>2. Use of AI Coaches</h2>
      <p>
        Our "AI Pocket Coaches" are designed to assist with learning. While we strive for accuracy, 
        AI-generated content may occasionally contain errors. We recommend students cross-verify 
        important information with official SEBA/AHSEC textbooks.
      </p>

      <h2>3. User Account</h2>
      <p>
        Users must be students or parents of students. You are responsible for maintaining the 
        confidentiality of your Clerk account. Axomprep reserves the right to suspend accounts 
        found to be abusing the system or scraping proprietary AI responses.
      </p>

      <h2>4. Intellectual Property</h2>
      <p>
        The specific prompts, UI design, and branding of Axomprep are our intellectual property. 
        However, the study notes and PDFs you upload remain yours.
      </p>

      <h2>5. Limitation of Liability</h2>
      <p>
        Axomprep is a supplemental study tool. We do not guarantee specific exam results or scores. 
        Success in the 2026 Board Exams depends on the student's overall effort and school curriculum.
      </p>

      <h2>6. Modifications</h2>
      <p>
        We may update these terms as we introduce new features like "Guess Papers" or OMR practice sets. 
        Continued use of the platform after updates constitutes acceptance of new terms.
      </p>
    </LegalWrapper>
  );
}
