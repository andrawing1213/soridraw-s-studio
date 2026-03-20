import { GoogleGenAI, Type } from "@google/genai";
import { SongResult, LyricsLength, DrumStyle } from "../types";
import { BASE_PROMPTS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateSong(
  genres: string[],
  moods: string[],
  themes: string[],
  userInput: string,
  lyricsLength: LyricsLength = 'normal',
  drumStyle: DrumStyle = 'none',
  vocalGender?: string,
  tempo?: string,
  specialPrompt?: string
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
      "appliedKeywords": {
        "genre": ["genre1", "genre2", ...],
        "mood": ["mood1", "mood2", ...],
        "theme": ["theme1", "theme2", ...],
        "tempo": "tempo info if provided"
      }
    }

    Rules for Title:
    - Use at most two main genres in the brackets.
    - Format: [Genre1 Genre2] 'English Title' / 'Korean Title'
    
    Rules for Lyrics:
    - Structure: [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Chorus], [Outro]
    - CRITICAL: Ensure clear line breaks between sections.
    - CRITICAL: The content of the lyrics MUST be influenced ONLY by the 'Themes' and 'User Story'. 
    - CRITICAL: The 'Genres' and 'Moods' should NOT directly influence the lyrics content, but they should influence the music prompt.
    - Length Constraint (lyricsLength: ${lyricsLength}):
      - 'very-short': Extremely concise and minimal lyrics. Only 2-3 lines per section.
      - 'short': Concise and implicit lyrics, suitable for Jazz or Ballads. Fewer lines per section.
      - 'normal': Standard length for most pop songs.
    - Provide both English and Korean versions.
    - CRITICAL: When providing Korean titles and lyrics, do NOT translate English literally. Instead, capture the lyrical and poetic essence of the song to make it feel natural, emotionally resonant, and beautiful in Korean. The Korean lyrics should read like a standalone poem or song.
    
    Rules for Prompt:
    ${specialPrompt ? `- SPECIAL GENRE INSTRUCTION: ${specialPrompt}` : ""}
    - Use the provided base prompts ONLY if the selected genres are EXCLUSIVELY from this specific list: ['Indie', 'Folk', 'R&B', 'Groovy', 'Acoustic'].
    - At least TWO genres from this specific list must be selected to use the base prompts.
    - If ANY other genre (e.g., Techno, K-Pop, Metal, etc.) is included in the selection, do NOT use the base prompts, even if the above conditions are met.
    - If NO genres are selected (unspecified generation), you have a 40% chance to use the base prompts as a style reference. Otherwise, create a fresh and appropriate style based on the moods and themes.
    - ALWAYS include these constraints: (Intimate and warm natural mix with light reverb, no dramatic build-up, no explosive climax, Target song length between 2 minutes 30 seconds and 3 minute, Soft and intimate outro, minimal instrumentation, Restrained vocal delivery, no dramatic ending, fade gently into silence, gradual instrumental fade-out).
    - DRUM STYLE: ${drumStyle === 'half-time' ? "Apply 'Half Time' drum style." : drumStyle === 'double-time' ? "Apply 'Double Time' drum style." : ""}
    - CRITICAL: The total song duration MUST be between 2 minutes 30 seconds and 3 minutes. NEVER exceed 3 minutes 20 seconds.
    - Ensure the song can be finished within 2 minutes 45 seconds if possible.
    - ${tempo ? `TEMPO CONSTRAINT: ${tempo}` : "Tempo should be appropriate for the genre and mood."}
    - ${vocalGender ? `VOCAL GENDER: ${vocalGender}` : "Vocal gender should be appropriate for the genre and mood."}
    
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
            type: Type.OBJECT,
            properties: {
              genre: { type: Type.ARRAY, items: { type: Type.STRING } },
              mood: { type: Type.ARRAY, items: { type: Type.STRING } },
              theme: { type: Type.ARRAY, items: { type: Type.STRING } },
              tempo: { type: Type.STRING },
              vocalGender: { type: Type.STRING }
            },
            required: ["genre", "mood", "theme"]
          }
        },
        required: ["title", "lyrics", "prompt", "appliedKeywords"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  return result as SongResult;
}
