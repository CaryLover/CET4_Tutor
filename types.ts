export enum AppTab {
  VOCABULARY = 'VOCABULARY',
  LISTENING = 'LISTENING',
  READING = 'READING',
  WRITING = 'WRITING',
}

export interface VocabularyData {
  word: string;
  phonetic: string;
  definition: string;
  mnemonic: string;
  exampleSentence: string;
  chineseTranslation: string;
}

export interface ReadingQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0-3 index
  explanation?: string; // Optional explanation for the correct answer
}

export interface ReadingExerciseData {
  title: string;
  passage: string;
  sentenceTranslations: { original: string; translation: string }[]; // Changed for sentence-by-sentence translation
  questions: ReadingQuestion[];
}

export interface WritingFeedbackData {
  score: number;
  feedback: string;
  correctedText: string;
  betterVersion: string;
}

export interface ListeningExerciseData {
  script: string;
  questions: ReadingQuestion[]; // Reusing ReadingQuestion structure
}