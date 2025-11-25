
import { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string; // Tailwind color class for text
  bgGradient?: string; // Optional gradient for icon background if needed
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
}

export interface Subject {
  id: string;
  title: string;
  chapterCount: number;
  progress: number;
  classLevel?: string;
}

export interface Chapter {
  id: string;
  title: string;
  subjectId: string;
  isLocked?: boolean;
  duration?: string;
  content?: string; // Chapter overview or intro content
}

export interface Topic {
  id: string;
  title: string;
  chapterId: string;
  subjectId: string;
  content?: string; // Markdown/LaTeX content for the lesson
}

export type QuestionType = 
  | 'mcq' 
  | 'gap_with_clues' 
  | 'gap_no_clues' 
  | 'rewrite' // For Narration, Transformation, Punctuation
  | 'classification'; // Treated structurally like MCQ but labeled differently if needed

export interface Question {
  id?: string;
  chapterId: string;
  topicId?: string; // Optional topic link
  type?: QuestionType; // defaults to 'mcq'
  question: string; // Supports {{answer}} syntax for gaps
  options?: string[]; // For MCQ
  correctAnswer?: number | string; // Index for MCQ, full string for Rewrite
  explanation?: string;
}

// Alias for backward compatibility with existing code
export type MCQ = Question;

export interface Formula {
  id?: string;
  chapterId: string;
  title: string;
  content: string; // LaTeX string
  classLevel?: string;
  subjectId?: string;
  createdAt?: number;
}

export interface VocabularyWord {
  id?: string;
  en: string;
  bn: string;
  pronunciation?: string;
  section?: string; // e.g. "Section 1"
  unit?: string;    // e.g. "Unit 1"
}
