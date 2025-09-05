import React, { useState, useCallback, ChangeEvent, useRef, useEffect } from 'react';
import { generateMemeImage } from './services/geminiService';
import { fileToDataUrl, cropImageToSquare } from './utils/imageUtils';

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);


const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-blue-600"></div>
);

const styles: { [key: string]: string } = {
    'Enchanted': '魔幻',
    'Realistic': '真人',
    'Anime': '动漫',
    'J-Art': '日系',
    'Exaggerated': '夸张',
    'Comical': '搞笑'
};


const App: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [memeText, setMemeText] = useState<string>('');
    const [promptDescription, setPromptDescription] = useState<string>('');
    const [redrawIntensity, setRedrawIntensity] = useState<number>(50);
    const [memeStyle, setMemeStyle] = useState<string>('Enchanted');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState<boolean>(false);
    
    const masterpieceRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (generatedImage && masterpieceRef.current) {
            masterpieceRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [generatedImage]);

    const handleImageChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const dataUrl = await fileToDataUrl(file);
                const croppedDataUrl = await cropImageToSquare(dataUrl);
                setOriginalImage(croppedDataUrl);
                setGeneratedImage(null);
                setError(null);
            } catch (err) {
                setError('Failed to read and crop image file.');
            }
        }
    }, []);

    const handleGenerate = async () => {
        if (!originalImage) {
            setError('Please upload an image to begin the magic.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const base64Data = originalImage.split(',')[1];
            if (!base64Data) {
                throw new Error("Invalid image data URL.");
            }
            
            const { base64: resultBase64, mimeType: resultMimeType } = await generateMemeImage(
                base64Data, 
                'image/png', // Cropped image is a PNG from the canvas
                memeText,
                promptDescription,
                redrawIntensity,
                memeStyle
            );
            setGeneratedImage(`data:${resultMimeType};base64,${resultBase64}`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during image generation.';
            setError(`Generation failed: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!generatedImage) return;

        try {
            const response = await fetch(generatedImage);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob,
                }),
            ]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            setError('Failed to copy image. Your browser may not support this feature.');
        }
    };
    
    const getDescriptionForIntensity = (intensity: number): string => {
        if (intensity <= 33) return "Subtle Magic: Keeps most of the original image.";
        if (intensity <= 66) return "Balanced Charm: Blends original features with the selected style.";
        return "Full Transformation: A strong style that may alter features significantly.";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-200 to-indigo-200 text-slate-800 font-sans p-4 sm:p-8">
            <div className="container mx-auto max-w-6xl">
                <header className="text-center mb-8">
                    <h1 className="text-5xl sm:text-7xl font-display text-blue-800 tracking-wider">Magic Meme Maker</h1>
                    <p className="text-lg sm:text-xl mt-2 text-blue-700 font-semibold">Enchanting Memes in Any Style</p>
                </header>

                <main className="flex flex-col gap-8">
                    <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-xl shadow-sky-300/50 border border-white/50">
                        <h2 className="text-3xl font-display text-blue-700 mb-4 border-b-2 border-blue-200 pb-2">1. Cast Your Spell</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Column 1: Image & Text Inputs */}
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="image-upload" className="block text-lg font-bold mb-2 text-slate-700">Upload Image (will be cropped to 1:1)</label>
                                    <label className="cursor-pointer w-full h-48 bg-sky-50/70 border-2 border-dashed border-blue-300 rounded-lg flex flex-col justify-center items-center text-slate-500 hover:border-amber-500 hover:text-amber-600 transition-colors">
                                        <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                        {originalImage ? (
                                            <img src={originalImage} alt="Preview" className="w-full h-full object-contain rounded-md" />
                                        ) : (
                                            <>
                                                <UploadIcon className="w-12 h-12" />
                                                <span className="mt-2 font-semibold">Click to upload</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                                 <div>
                                    <label htmlFor="prompt-description" className="block text-lg font-bold mb-2 text-slate-700">Meme Description (Optional)</label>
                                    <textarea
                                        id="prompt-description"
                                        value={promptDescription}
                                        onChange={(e) => setPromptDescription(e.target.value)}
                                        placeholder="e.g., 'A character looking triumphant and happy'"
                                        rows={3}
                                        className="w-full p-3 bg-white/80 border border-blue-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition text-lg"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="meme-text" className="block text-lg font-bold mb-2 text-slate-700">Meme Text (Optional)</label>
                                    <textarea
                                        id="meme-text"
                                        value={memeText}
                                        onChange={(e) => setMemeText(e.target.value)}
                                        placeholder="e.g., 'When the coffee kicks in'"
                                        rows={2}
                                        className="w-full p-3 bg-white/80 border border-blue-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition text-lg"
                                    />
                                </div>
                            </div>
                            
                            {/* Column 2: Style & Intensity */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-lg font-bold mb-3 text-slate-700">Choose a Style</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(styles).map(([key, label]) => (
                                            <button
                                                key={key}
                                                onClick={() => setMemeStyle(key)}
                                                className={`px-4 py-2 text-sm font-semibold rounded-full shadow-sm transition-all transform hover:scale-105 ${
                                                    memeStyle === key 
                                                    ? 'bg-blue-600 text-white border-2 border-blue-800' 
                                                    : 'bg-white/80 text-slate-700 border border-blue-300 hover:bg-amber-100'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <label htmlFor="intensity-slider" className="block text-lg font-bold mb-2 text-slate-700">
                                        Redraw Intensity: <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded-md shadow-sm">{redrawIntensity}</span>
                                    </label>
                                    <input
                                        id="intensity-slider"
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={redrawIntensity}
                                        onChange={(e) => setRedrawIntensity(parseInt(e.target.value, 10))}
                                        className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer range-lg accent-blue-600"
                                        aria-describedby="intensity-description"
                                    />
                                    <div id="intensity-description" className="text-sm text-slate-600 mt-1 text-center font-medium">
                                        {getDescriptionForIntensity(redrawIntensity)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                             <button
                                onClick={handleGenerate}
                                disabled={isLoading || !originalImage}
                                className="w-full bg-blue-600 text-white font-bold text-2xl py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 border-2 border-blue-800"
                            >
                                {isLoading ? "Crafting Magic..." : "Generate!"}
                            </button>
                        </div>
                    </div>
                    
                    <div ref={masterpieceRef} className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-xl shadow-sky-300/50 border border-white/50 flex flex-col">
                        <h2 className="text-3xl font-display text-blue-700 mb-4 border-b-2 border-blue-200 pb-2">2. Your Masterpiece</h2>
                        <div className="flex-grow w-full max-w-2xl mx-auto bg-sky-50/70 border-2 border-dashed border-blue-300 rounded-lg flex justify-center items-center text-slate-500 relative aspect-square">
                            {isLoading && (
                                <div className="flex flex-col items-center justify-center text-center p-4">
                                    <Spinner />
                                    <p className="mt-4 font-semibold text-lg text-blue-800">The AI is crafting your masterpiece...</p>
                                    <p className="mt-2 text-sm text-slate-600">This can take up to two minutes. Please wait!</p>
                                </div>
                            )}
                            {error && !isLoading && <p className="text-red-600 font-bold p-4 text-center">{error}</p>}
                            {generatedImage && !isLoading && (
                                <>
                                    <img src={generatedImage} alt="Generated Meme" className="w-full h-full object-contain rounded-md" />
                                    <button
                                        onClick={handleCopy}
                                        className="absolute bottom-3 right-3 bg-amber-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-amber-600 transition-transform transform hover:scale-105 flex items-center gap-2 border-2 border-amber-700"
                                    >
                                        {isCopied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                                        {isCopied ? 'Copied!' : 'Copy'}
                                    </button>
                                </>
                            )}
                            {!generatedImage && !isLoading && !error && <p className="font-semibold text-center">Your generated image will appear here</p>}
                        </div>
                         <div className="text-center mt-4 text-sm text-slate-600">
                           <p>✨ AI magic might take a moment. Please be patient! ✨</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;