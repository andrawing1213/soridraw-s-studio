import { GoogleGenAI, Type } from "@google/genai";
import { SongResult } from "../types";
import { BASE_PROMPTS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateSong(
  genres: string[],
  moods: string[],
  themes: string[],
  userInput: string
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
    - Length: The song should be around 2:40 to 3:10 minutes long.
    - Provide both English and Korean versions.
    
    Rules for Prompt:
    - Use one of the provided base prompts as a reference and modify it to fit the selected keywords.
    - ALWAYS include these constraints: (Restrained and steady emotional delivery, Target song length between 2 minutes 40 seconds and 3 minutes 10 seconds, soft and intimate outro, minimal instrumentation, gradual instrumental fade-out, restrained vocal delivery, no dramatic ending, fade gently into silence).
    - Ensure the song can be finished within 2 minutes 45 seconds if possible.
    
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
