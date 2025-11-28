import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VocabularyData, ReadingExerciseData, WritingFeedbackData, ListeningExerciseData } from "../types";

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

// --- Vocabulary Service ---
export const fetchVocabulary = async (word: string): Promise<VocabularyData> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Explain the English word "${word}" for a CET-4 (Chinese English Test Band 4) student. Provide phonetic, definition, a clever mnemonic (memory aid), and an example.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          phonetic: { type: Type.STRING },
          definition: { type: Type.STRING, description: "Simple English definition" },
          chineseTranslation: { type: Type.STRING },
          mnemonic: { type: Type.STRING, description: "A creative, funny, or logical memory aid in Chinese to help remember the word." },
          exampleSentence: { type: Type.STRING },
        },
        required: ["word", "phonetic", "definition", "chineseTranslation", "mnemonic", "exampleSentence"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as VocabularyData;
};

// --- Reading Service ---
export const fetchReadingExercise = async (topic: string): Promise<ReadingExerciseData> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a short CET-4 reading comprehension passage about "${topic}". 
    
    Requirements:
    1. Include 5 multiple choice questions arranged from easy to hard.
    2. Include detailed explanations (in Chinese) for the correct answers.
    3. CRITICAL: Provide the translation strictly broken down sentence by sentence.
    
    Structure the 'sentenceTranslations' as an array where each item has the original English sentence and its Chinese translation.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          passage: { type: Type.STRING, description: "A passage of about 200-300 words suitable for CET-4 level." },
          sentenceTranslations: { 
            type: Type.ARRAY, 
            description: "Sentence-by-sentence translation of the passage.",
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                translation: { type: Type.STRING }
              }
            }
          },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-3)" },
                explanation: { type: Type.STRING, description: "Explanation of why the answer is correct (in Chinese)." }
              },
              required: ["id", "question", "options", "correctAnswer", "explanation"]
            }
          }
        },
        required: ["title", "passage", "sentenceTranslations", "questions"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as ReadingExerciseData;
};

// --- Writing Service ---
export const fetchWritingTopic = async (): Promise<{title: string, requirements: string}> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a random English writing task suitable for the CET-4 exam. It could be an essay based on a statement, a letter, or a description of a chart/picture (describe the chart in text).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The title of the essay or the topic." },
          requirements: { type: Type.STRING, description: "The specific instructions, e.g., 'You should write at least 120 words on the topic...'" }
        },
        required: ["title", "requirements"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as {title: string, requirements: string};
};

export const gradeWriting = async (prompt: string, essay: string): Promise<WritingFeedbackData> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Task: Grade this CET-4 practice essay based on official examination standards.
    
    Topic/Prompt: ${prompt}
    Student Essay: ${essay}
    
    Output Requirements:
    1. Score (0-15 scale).
    2. Constructive feedback in Chinese.
    3. Corrected Text: Retype the student's essay but fix grammar/vocab errors. IMPORTANT: Wrap any corrected, changed, or added words in double equals signs like ==this== so they can be highlighted programmatically.
    4. Better Version: A rewritten version using advanced vocabulary.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          correctedText: { type: Type.STRING, description: "The corrected essay with changes wrapped in ==...==" },
          betterVersion: { type: Type.STRING },
        },
        required: ["score", "feedback", "correctedText", "betterVersion"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as WritingFeedbackData;
};

// --- Listening Service (Data Generation) ---
export const fetchListeningScript = async (topic: string): Promise<ListeningExerciseData> => {
   const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a short conversational script or news report (CET-4 listening style) about "${topic}". Follow it with 5 multiple choice questions. The questions must be arranged in order of difficulty, from easy to hard. 
    
    CRITICAL FORMATTING INSTRUCTION: 
    1. Use realistic names for the speakers (e.g., Tom, Tony, Rose, Dr. Smith) instead of just "A" or "B".
    2. You MUST use a newline for every change of speaker. 
    3. Format each line strictly as "SpeakerName: Text".

    Example format:
    Tom: Hello there, Rose.
    Rose: Hi Tom, how are you?
    Tom: I am fine.
    
    Do NOT merge speakers into one paragraph.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING, description: "The text to be spoken. STRICTLY use newlines to separate speakers." },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER },
              },
              required: ["id", "question", "options", "correctAnswer"]
            }
          }
        },
        required: ["script", "questions"],
      },
    },
  });
  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as ListeningExerciseData;
}

// --- Listening Service (Audio Generation - Legacy Block) ---
export const generateSpeech = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Failed to generate audio");
  return base64Audio;
};

// --- Listening Service (Audio Generation - Streaming) ---
export async function* streamSpeech(text: string, isDialogue: boolean = false) {
  let speechConfig;
  
  if (isDialogue) {
    // Dynamically detect speaker names from the text to support realistic names like "Tom", "Rose"
    // Regex matches "Name:" at the beginning of a line.
    const speakerPattern = /^\s*([A-Za-z\.]+):/gm;
    const matches = Array.from(text.matchAll(speakerPattern)).map(m => m[1]);
    const uniqueSpeakers = [...new Set(matches)];

    // Assign voices: 1st speaker -> Kore, 2nd speaker -> Fenrir
    // Fallback to A/B if no structured names found
    const speaker1 = uniqueSpeakers[0] || 'A';
    const speaker2 = uniqueSpeakers[1] || 'B';

    speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          {
            speaker: speaker1,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          {
            speaker: speaker2,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
          }
        ]
      }
    };
  } else {
    speechConfig = {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Kore' },
      },
    };
  }

  const responseStream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: speechConfig,
    },
  });

  for await (const chunk of responseStream) {
    const audioData = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      yield audioData;
    }
  }
}