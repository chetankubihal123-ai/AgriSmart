import { useState } from 'react';
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

    const initializeModels = async () => {
        if (isInitialized || modelLoading) return;
        
        try {
            setModelLoading(true);
            await tf.ready();
            
            // Load base MobileNet
            const loadedModel = await mobilenet.load();
            setModel(loadedModel);

            // Load all custom TM models in parallel
            const loadCustom = async (key: CropType, url: string) => {
                try {
                    const modelURL = url + "model.json";
                    const metadataURL = url + "metadata.json";
                    return { key, tmModel: await tmImage.load(modelURL, metadataURL) };
                } catch (e) {
                    console.error(`Failed to load ${key} model`, e);
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
        } catch (err) {
            console.error("Failed to load models", err);
            setModelError("Failed to load AI model. Please check your internet connection.");
            setModelLoading(false);
        }
    };

    // We still keep a small state for auto-loading if we really want to, 
    // but better to leave it to the components to call initializeModels() when they mount or through a button.
    // For now, let's keep it manual.

    const classifyImage = async (imageElement: HTMLImageElement, selectedCrop: CropType = 'tomato'): Promise<ClassificationResult> => {
        if (!model) {
            return { isPlant: false, predictions: [], error: "Model not loaded" };
        }

        try {
            // 1. MobileNet Check (Is it a plant?)
            const predictions = await model.classify(imageElement);

            const plantKeywords = [
                'plant', 'tree', 'flower', 'vegetable', 'fruit', 'leaf', 'grass', 'agriculture', 'farm', 'crop',
                'wheat', 'corn', 'rice', 'potato', 'tomato', 'broccoli', 'cabbage', 'carrot',
                'garden', 'field', 'greenhouse', 'pot', 'vase', 'produce', 'food', 'grain', 'seed', 'bush', 'shrub', 'herb',
                'ear', 'spike', 'head', 'maize', 'fodder', 'hay', 'rapeseed', 'daisy', 'buckeye', 'coral fungus', 'agaric', 'mushroom'
            ];

            const artificialKeywords = [
                'comic', 'cartoon', 'book', 'illustration', 'toy', 'doll', 'action figure', 'poster', 'screen', 'monitor',
                'jigsaw', 'puzzle', 'art', 'sketch', 'drawing', 'painting', 'graffiti'
            ];

            const topPredictions = predictions.slice(0, 3);
            const isArtificial = topPredictions.some(p =>
                artificialKeywords.some(keyword => p.className.toLowerCase().includes(keyword))
            );

            const isPlant = !isArtificial && predictions.some(p =>
                plantKeywords.some(keyword => p.className.toLowerCase().includes(keyword))
            );

            // 2. Custom Model Auto-Check
            let customPredictions: { className: string; probability: number }[] | undefined;
            
            // Auto-detect which custom model to run based on MobileNet results
            let activeCrop: CropType | null = null;
            if (isPlant) {
                const searchStr = topPredictions.map(p => p.className.toLowerCase()).join(' ');
                if (searchStr.includes('tomato')) activeCrop = 'tomato';
                else if (searchStr.includes('corn') || searchStr.includes('maize')) activeCrop = 'corn';
                else if (searchStr.includes('chilli') || searchStr.includes('pepper')) activeCrop = 'chilli';
            }

            // Default to selectedCrop if we can't find a better match, but prioritizing detected crop
            const finalCrop = activeCrop || selectedCrop;
            const targetModel = customModels[finalCrop];

            if (targetModel && isPlant) {
                try {
                    customPredictions = await targetModel.predict(imageElement);
                    customPredictions.sort((a, b) => b.probability - a.probability);
                } catch (e) {
                    console.error(`${finalCrop} model prediction failed`, e);
                }
            }

            return {
                isPlant,
                predictions,
                customPredictions
            };

        } catch (error) {
            console.error("Classification error", error);
            return { isPlant: false, predictions: [], error: "Failed to classify image." };
        }
    };

    return {
        model,
        modelLoading,
        modelError,
        classifyImage,
        initializeModels,
        isCustomModelLoaded: Object.values(customModels).some(m => m !== null)
    };
}
