import { GoogleGenAI, Type } from "@google/genai";
import { SongResult } from "../types";
import { BASE_PROMPTS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateSong(
  genres: string[],
  moods: string[],
  themes: string[],
  userInput: string,
  tempo?: string
): Promise<SongResult> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are a professional music composer and lyricist.
    Your task is to generate a song based on the provided genres, moods, themes, and user story.
    
    Output Format:
    Return a JSON object with the following structure:
    {
      "title": "[Genre1 Genre2] 'English Title' / 'Korean Title'",
      "lyrics": {
        "english": "Full English lyrics with structure like [Verse 1], [Chorus], etc.",
        "korean": "Full Korean translation of the lyrics with the same structure"
      },
      "prompt": "A detailed music production prompt",
      "appliedKeywords": ["keyword1", "keyword2", ...]
    }

    Rules for Title:
    - Use at most two main genres in the brackets.
    - Format: [Genre1 Genre2] 'English Title' / 'Korean Title'
    
    Rules for Lyrics:
    - Structure: [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Chorus], [Outro]
    - Length: Adjust the lyrics length based on the tempo, genre, and mood of the song to ensure it fits within the target duration (2:30 to 3:00 minutes).
    - Provide both English and Korean versions.
    - CRITICAL: When providing Korean titles and lyrics, do NOT translate English literally. Instead, capture the lyrical and poetic essence of the song to make it feel natural, emotionally resonant, and beautiful in Korean. The Korean lyrics should read like a standalone poem or song.
    
    Rules for Prompt:
    - If the selected genres include 'Indie', 'Folk', 'R&B', 'Groovy', or 'Acoustic', use the provided base prompts as a primary reference for the musical style.
    - If the selected genres do NOT include these specific genres, do NOT force the song into those styles. Instead, generate a unique prompt that accurately reflects the chosen genres (e.g., Techno, K-Pop, Metal, etc.).
    - If NO genres are selected (unspecified generation), you have a 40% chance to use the base prompts as a style reference. Otherwise, create a fresh and appropriate style based on the moods and themes.
    - ALWAYS include these constraints: (Intimate and warm natural mix with light reverb, no dramatic build-up, no explosive climax, Target song length between 2minutes 40seconds and 3minutes 10seconds, Soft and intimate 3-5 seconds instrumental outro after vocals end, minimal instrumentation, Restrained vocal delivery, no dramatic ending, fade gently into silence, gradual instrumental fade-out).
    - CRITICAL: The total song duration MUST be between 2 minutes 30 seconds and 3 minutes. NEVER exceed 3 minutes 20 seconds.
    - Ensure the song can be finished within 2 minutes 45 seconds if possible.
    - ${tempo ? `TEMPO CONSTRAINT: ${tempo}` : "Tempo should be appropriate for the genre and mood."}
    
    Keywords to use:
    Genres: ${genres.join(", ")}
    Moods: ${moods.join(", ")}
    Themes: ${themes.join(", ")}
    User Story: ${userInput}
    
    Reference Prompts:
    ${BASE_PROMPTS.join("\n\n")}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: "Generate a song based on the system instructions.",
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          lyrics: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING },
              korean: { type: Type.STRING }
            },
            required: ["english", "korean"]
          },
          prompt: { type: Type.STRING },
          appliedKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "lyrics", "prompt", "appliedKeywords"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  return result as SongResult;
}
