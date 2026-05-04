import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SKETCH_BASE_PROMPT = `high-quality artistic pencil sketch, professional character concept art, fine graphite linework, delicate cross-hatching, visible but elegant construction lines, authentic sketchbook paper texture, soft charcoal shading, architectural drawing precision mixed with artistic fluidness, monochrome (black and white), sharp focus on character features, clean white background, traditional medium feel`;

export type SketchStyle = 'Cartoon' | 'Semi-realista' | 'Realista' | 'Infantil' | 'HQ (comic style)' | 'Mangá' | 'Cyberpunk' | 'Vintage';

export interface GenerationConfig {
  prompt: string;
  style: SketchStyle;
  references?: string[]; // base64 images
  settings?: {
    contrast: number;
    texture: number;
    constructionLines: number;
  };
}

export async function generateSketch(config: GenerationConfig): Promise<{ imageUrl: string; fullPrompt: string }> {
  if (!ai) {
    throw new Error("GEMINI_API_KEY não configurada. Adicione sua chave no arquivo .env");
  }
  const stylePromptMap: Record<SketchStyle, string> = {
    'Cartoon': 'classic cartoon proportions, exaggerated features, clean but sketchy outlines',
    'Semi-realista': 'balanced proportions, anatomical focus, refined shading',
    'Realista': 'highly detailed anatomy, realistic lighting and textures, fine pencil strokes',
    'Infantil': 'soft shapes, cute and simple features, friendly and round designs',
    'HQ (comic style)': 'dynamic action lines, strong hatching, dramatic contrast, traditional comic book ink-like pencil work',
    'Mangá': 'anime-style eyes and proportions, cel-shaded pencil hatching, delicate linework',
    'Cyberpunk': 'technological details, robotic parts integrated into anatomy, glowing-like pencil lines, futuristic gear',
    'Vintage': '19th century scientific illustration style, aged paper feel, very fine etching-like lines, classical proportions'
  };

  const fullPrompt = `TASK: Generate a NEW sketch based on the Artist Prompt, maintaining ABSOLUTE VISUAL CONSISTENCY with the attached REFERENCE IMAGES.

ARTIST PROMPT: ${config.prompt}
ARTISTIC STYLE: ${config.style} (${stylePromptMap[config.style]})

${config.settings ? `TECHNICAL ADJUSTMENTS:
- Graphite Contrast Level: ${config.settings.contrast}/100
- Paper Texture Intensity: ${config.settings.texture}/100
- Construction Lines Visibility: ${config.settings.constructionLines}/100` : ''}

STRICT REQUIREMENTS:
1. CHARACTER IDENTITY: Replicate the EXACT features, proportions, clothing details, and unique traits from the reference images. Do NOT invent a new character.
2. SKETCH STYLE: Follow the pencil sketch requirements: ${SKETCH_BASE_PROMPT}.
3. COMPOSITION: Execute the scene described in the Artist Prompt using the Identity from the references.
4. FINAL FORMAT: Strictly monochrome graphite pencil on plain white paper. No background colors.`;

  try {
    const parts: any[] = [{ text: fullPrompt }];
    
    // Add reference images if any
    if (config.references && config.references.length > 0) {
      config.references.forEach(ref => {
        // Assuming ref is a data URL, extract just the base64 part
        const base64Data = ref.split(',')[1] || ref;
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/png"
          }
        });
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    let imageUrl = "";
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        imageUrl = `data:image/png;base64,${base64EncodeString}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("Não foi possível gerar a imagem.");
    }

    return { imageUrl, fullPrompt };
  } catch (error: any) {
    console.error("ERRO DETALHADO NA GERAÇÃO:", error);
    if (error.response) {
      console.error("CORPO DO ERRO:", JSON.stringify(error.response, null, 2));
    }
    throw error;
  }
}
