// FIX: Import GenerateContentResponse to explicitly type the API response.
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Timeout helper to prevent indefinite loading states
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Request timed out after ${ms / 1000} seconds.`));
        }, ms);

        promise
            .then(value => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch(reason => {
                clearTimeout(timer);
                reject(reason);
            });
    });
};

interface GeneratedImage {
    base64: string;
    mimeType: string;
}

const getStyleInstruction = (style: string): string => {
    switch (style) {
        case 'Realistic':
            return "in a photorealistic, cinematic style, as if it were a still from a live-action movie";
        case 'Anime':
            return "in a vibrant Japanese anime style, with characteristic large eyes, expressive features, and dynamic lines";
        case 'J-Art':
            return "in a beautiful, painterly Japanese art style, similar to concept art for a fantasy JRPG";
        case 'Exaggerated':
            return "in a heavily exaggerated caricature style, amplifying the subject's expression and features for comedic effect";
        case 'Comical':
            return "in a goofy, comical cartoon style with bright colors and simplified, funny shapes";
        case 'Enchanted':
        default:
            return "in the classic Disney animation style, reminiscent of films like 'The Little Mermaid' or 'Aladdin'";
    }
};

const getIntensityInstruction = (intensity: number): string => {
    if (intensity <= 33) {
        return "Subtly apply the style, making minimal changes to the original image's structure and preserving the subject's facial features as closely as possible.";
    }
    if (intensity <= 66) {
        return "Apply a balanced style, preserving the core facial features of the subject while clearly transforming the overall aesthetic.";
    }
    return "Heavily redraw the image in the style, retaining only the most essential facial characteristics (like eye position and basic expression) while transforming everything else significantly.";
};


/**
 * Generates a meme image in a specified artistic style.
 * @param base64ImageData The base64 encoded string of the original image.
 * @param mimeType The MIME type of the original image.
 * @param memeText The text to integrate into the image (can be empty).
 * @param description The instructions for the AI on how to alter the image's mood and expression (can be empty).
 * @param redrawIntensity A number from 0-100 indicating how much to alter the image.
 * @param style The artistic style to apply to the image.
 * @returns A promise that resolves to an object containing the base64 encoded string and MIME type of the generated image.
 */
export const generateMemeImage = async (
    base64ImageData: string,
    mimeType: string,
    memeText: string,
    description: string,
    redrawIntensity: number,
    style: string
): Promise<GeneratedImage> => {
    try {
        const intensityInstruction = getIntensityInstruction(redrawIntensity);
        const styleInstruction = getStyleInstruction(style);
        
        let textInstruction = "";
        if (memeText.trim()) {
            textInstruction = `Finally, integrate the text "${memeText}" into the image using a prominent, stylized font that fits the chosen aesthetic.`;
        }

        let descriptionInstruction = "";
        if (description.trim()) {
            descriptionInstruction = `Crucially, you must modify the subject's expression, pose, and the scene's atmosphere to visually represent the following description: "${description}".`;
        }

        const fullPrompt = `Your task is to create an image. Redraw the provided image ${styleInstruction}. ${descriptionInstruction} ${intensityInstruction} ${textInstruction} The output must be the final image only, with no explanatory text.`;

        const generationPromise = ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: fullPrompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        // FIX: Explicitly type the response to resolve 'unknown' type error.
        const response: GenerateContentResponse = await withTimeout(generationPromise, 120000); // 120 second timeout

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        
        if (imagePart?.inlineData) {
            return {
                base64: imagePart.inlineData.data,
                mimeType: imagePart.inlineData.mimeType,
            };
        }

        // If no image part is found, check for text which might contain an error from the model.
        const textPart = response.candidates?.[0]?.content?.parts?.find(part => part.text);
        if (textPart?.text) {
             throw new Error(`Model returned text instead of an image: ${textPart.text}`);
        }
        
        throw new Error("No image data found in the API response.");

    } catch (error) {
        console.error("Error generating image with Gemini API:", error);
        if (error instanceof Error) {
            if (error.message.includes('timed out')) {
                throw new Error("Image generation timed out. The image may be too complex. Please try again with a different image.");
            }
            throw new Error(`API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while calling the Gemini API.");
    }
};