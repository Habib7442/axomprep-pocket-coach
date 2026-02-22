"use client";

import { LegalWrapper } from "@/components/LegalWrapper";

export default function PrivacyPage() {
  return (
    <LegalWrapper title="Privacy Policy" lastUpdated="February 19, 2026">
      <h2>1. Introduction</h2>
      <p>
        Welcome to Axomprep! This Privacy Policy explains how we collect, use, and protect your personal 
        information when you use our AI Pocket Coach platform. We are committed to protecting your privacy 
        and being transparent about our data practices.
      </p>

      <h2>2. Information We Collect</h2>
      <p>
        We collect information to provide a better learning experience for SEBA and AHSEC students. This includes:
      </p>
      <ul>
        <li><strong>Account Information:</strong> Emails and names provided during authentication.</li>
        <li><strong>Study Data:</strong> Questions you upload, chat history with your AI coaches, and PDF textbooks you provide for context.</li>
        <li><strong>Audio Data:</strong> Temporary audio streams used for our real-time voice coaching feature (not stored permanently unless specified).</li>
      </ul>

      <h2>3. How We Use Your Data</h2>
      <p>
        Your data is used to:
      </p>
      <ul>
        <li>Personalize your AI coach's responses and teaching style.</li>
        <li>Identify "Must-Know" question patterns based on your specific curriculum.</li>
        <li>Improve our AI models for Assamese and English educational support.</li>
        <li>Manage your subscription and tier status.</li>
      </ul>

      <h2>4. Data Protection</h2>
      <p>
        We use industry-standard encryption and secure Supabase database configurations to ensure your private 
        study notes and personal details are safe from unauthorized access.
      </p>

      <h2>5. AI Interactions</h2>
      <p>
        Our platform utilizes Gemini AI models. While we provide context-specific guidance, 
        your interactions are processed by Google's AI services to generate responses. We do not 
        sell your private study data to third parties.
      </p>

      <h2>6. Contact Us</h2>
      <p>
        If you have questions about this policy, please reach out to our team at support@axomprep.in.
      </p>
    </LegalWrapper>
  );
}
