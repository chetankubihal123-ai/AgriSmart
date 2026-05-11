import { useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tmImage from '@teachablemachine/image';

export interface ClassificationResult {
    isPlant: boolean;
    predictions: { className: string; probability: number }[];
    error?: string;
    customPredictions?: { className: string; probability: number }[];
}

export type CropType = 'tomato' | 'corn' | 'chilli';

const CROP_MODELS: Record<CropType, string> = {
    tomato: 'https://teachablemachine.withgoogle.com/models/2vRwO2g0X/',
    corn: 'https://teachablemachine.withgoogle.com/models/ICOh_TngP/',
    chilli: 'https://teachablemachine.withgoogle.com/models/9ueDCD3gc/'
};

export function useImageClassifier() {
    const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
    const [customModels, setCustomModels] = useState<Record<string, tmImage.CustomMobileNet | null>>({
        tomato: null,
        corn: null,
        chilli: null
    });
    const [modelLoading, setModelLoading] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);

    const [isInitialized, setIsInitialized] = useState(false);

    const initializeModels = useCallback(async () => {
        if (isInitialized || modelLoading) return;
        
        try {
            setModelLoading(true);
            setModelError(null);
            console.log("Initializing AI models...");
            await tf.ready();
            
            // Load base MobileNet
            const loadedModel = await mobilenet.load({
                version: 2,
                alpha: 1.0
            });
            setModel(loadedModel);

            // Load all custom TM models in parallel
            const loadCustom = async (key: CropType, url: string) => {
                try {
                    const modelURL = url + "model.json";
                    const metadataURL = url + "metadata.json";
                    return { key, tmModel: await tmImage.load(modelURL, metadataURL) };
                } catch (e) {
                    console.warn(`Failed to load ${key} custom model`, e);
                    return { key, tmModel: null };
                }
            };

            const loadedCustoms = await Promise.all([
                loadCustom('tomato', CROP_MODELS.tomato),
                loadCustom('corn', CROP_MODELS.corn),
                loadCustom('chilli', CROP_MODELS.chilli)
            ]);

            const newCustomModels = { ...customModels };
            loadedCustoms.forEach(({ key, tmModel }) => {
                newCustomModels[key] = tmModel;
            });
            
            setCustomModels(newCustomModels);
            setIsInitialized(true);
            setModelLoading(false);
            console.log("AI models initialized successfully.");
        } catch (err) {
            console.error("Failed to load models:", err);
            setModelError("Failed to load AI model. Please check your internet connection.");
            setModelLoading(false);
        }
    }, [isInitialized, modelLoading, customModels]);

    // We still keep a small state for auto-loading if we really want to, 
    // but better to leave it to the components to call initializeModels() when they mount or through a button.
    // For now, let's keep it manual.

    const classifyImage = useCallback(async (imageElement: HTMLImageElement, selectedCrop: CropType = 'tomato'): Promise<ClassificationResult> => {
        if (!model) {
            return { isPlant: false, predictions: [], error: "Model not loaded" };
        }

        try {
            // 1. MobileNet Check (Is it a plant?)
            const predictions = await model.classify(imageElement);

            const plantKeywords = [
                'plant', 'tree', 'flower', 'vegetable', 'fruit', 'leaf', 'grass', 'agriculture', 'farm', 'crop',
                'wheat', 'corn', 'rice', 'potato', 'tomato', 'broccoli', 'cabbage', 'carrot', 'pepper', 'chilli', 'capsicum',
                'garden', 'field', 'greenhouse', 'pot', 'vase', 'produce', 'food', 'grain', 'seed', 'bush', 'shrub', 'herb',
                'ear', 'spike', 'head', 'maize', 'fodder', 'hay', 'rapeseed', 'daisy', 'buckeye', 'coral fungus', 'agaric', 'mushroom',
                'cardoon', 'thistle', 'vine', 'weed', 'texture', 'pattern', 'velvet', 'organic', 'structure', 'vein'
            ];

            const artificialKeywords = [
                'comic', 'cartoon', 'book', 'illustration', 'toy', 'doll', 'action figure', 'poster', 'screen', 'monitor',
                'jigsaw', 'puzzle', 'art', 'sketch', 'drawing', 'painting', 'graffiti'
            ];

            const topPredictions = predictions.slice(0, 5);
            const isArtificial = topPredictions.some(p =>
                artificialKeywords.some(keyword => p.className.toLowerCase().includes(keyword))
            );



            // 2. Custom Model Check - Use the selected crop model for maximum accuracy
            let customPredictions: { className: string; probability: number }[] | undefined;
            
            const targetModel = customModels[selectedCrop];

            if (targetModel) {
                try {
                    customPredictions = await targetModel.predict(imageElement);
                    customPredictions.sort((a, b) => b.probability - a.probability);
                } catch (e) {
                    console.error(`${selectedCrop} model prediction failed`, e);
                }
            }

            // Stricter plant check: must have a plant keyword in top 5 and NOT be artificial
            // OR the custom model must be somewhat confident (meaning it recognizes it as a known disease/crop)
            const hasPlantKeyword = predictions.slice(0, 5).some(p =>
                plantKeywords.some(keyword => p.className.toLowerCase().includes(keyword))
            );

            const isTMConfident = customPredictions && customPredictions.length > 0 && customPredictions[0].probability > 0.1;

            const isPlant = (!isArtificial && hasPlantKeyword) || isTMConfident;

            return {
                isPlant,
                predictions,
                customPredictions
            };

        } catch (error) {
            console.error("Classification error", error);
            return { isPlant: false, predictions: [], error: "Failed to classify image." };
        }
    }, [model, customModels]);

    const classifyAll = useCallback(async (imageElement: HTMLImageElement): Promise<{ className: string; probability: number }[]> => {
        const results: { className: string; probability: number }[] = [];
        
        const modelsToRun = Object.entries(customModels).filter(([_, m]) => m !== null);
        
        await Promise.all(modelsToRun.map(async ([crop, tmModel]) => {
            try {
                const predictions = await tmModel!.predict(imageElement);
                predictions.forEach(p => {
                    results.push({
                        className: p.className,
                        probability: p.probability
                    });
                });
            } catch (e) {
                console.warn(`${crop} model failed during multi-scan`, e);
            }
        }));

        return results.sort((a, b) => b.probability - a.probability);
    }, [customModels]);

    return {
        model,
        modelLoading,
        modelError,
        classifyImage,
        classifyAll,
        initializeModels,
        isCustomModelLoaded: Object.values(customModels).some(m => m !== null)
    };
}
