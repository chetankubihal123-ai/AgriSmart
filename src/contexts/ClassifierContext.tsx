import React, { createContext, useContext, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tmImage from '@teachablemachine/image';

export type CropType = 'tomato' | 'corn' | 'chilli';

export interface ClassificationResult {
    isPlant: boolean;
    predictions: { className: string; probability: number }[];
    error?: string;
    customPredictions?: { className: string; probability: number }[];
}

interface ClassifierContextProps {
    model: mobilenet.MobileNet | null;
    customModels: Record<string, tmImage.CustomMobileNet | null>;
    modelLoading: boolean;
    modelError: string | null;
    isInitialized: boolean;
    isCustomModelLoaded: boolean;
    initializeModels: () => Promise<void>;
    classifyImage: (imageElement: HTMLImageElement, selectedCrop?: CropType) => Promise<ClassificationResult>;
    classifyAll: (imageElement: HTMLImageElement) => Promise<{ className: string; probability: number }[]>;
}

const ClassifierContext = createContext<ClassifierContextProps | undefined>(undefined);

const CROP_MODELS: Record<CropType, string> = {
    tomato: 'https://teachablemachine.withgoogle.com/models/FO53wg6gQO/',
    corn: 'https://teachablemachine.withgoogle.com/models/FO53wg6gQO/',
    chilli: 'https://teachablemachine.withgoogle.com/models/FO53wg6gQO/'
};

// Global singletons to persist loaded models across re-renders
let globalMobileNet: mobilenet.MobileNet | null = null;
let globalCustomModels: Record<string, tmImage.CustomMobileNet | null> = {
    tomato: null,
    corn: null,
    chilli: null
};
let globalInitialized = false;

export function ClassifierProvider({ children }: { children: React.ReactNode }) {
    const [model, setModel] = useState<mobilenet.MobileNet | null>(globalMobileNet);
    const [customModels, setCustomModels] = useState<Record<string, tmImage.CustomMobileNet | null>>(globalCustomModels);
    const [modelLoading, setModelLoading] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(globalInitialized);

    const initializeModels = useCallback(async () => {
        if (globalInitialized || modelLoading) return;
        
        try {
            setModelLoading(true);
            setModelError(null);
            console.log("Initializing global AI models in background...");
            await tf.ready();
            
            // Load base MobileNet (if not already loaded)
            if (!globalMobileNet) {
                globalMobileNet = await mobilenet.load({
                    version: 2,
                    alpha: 1.0
                });
            }
            setModel(globalMobileNet);

            // Load all custom TM models in parallel
            const loadCustom = async (key: CropType, url: string) => {
                if (globalCustomModels[key]) {
                    return { key, tmModel: globalCustomModels[key] };
                }
                try {
                    const modelURL = url + "model.json";
                    const metadataURL = url + "metadata.json";
                    const tmModel = await tmImage.load(modelURL, metadataURL);
                    return { key, tmModel };
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

            const newCustomModels = { ...globalCustomModels };
            loadedCustoms.forEach(({ key, tmModel }) => {
                if (tmModel) {
                    newCustomModels[key] = tmModel;
                    globalCustomModels[key] = tmModel;
                }
            });
            
            setCustomModels(newCustomModels);
            globalInitialized = true;
            setIsInitialized(true);
            setModelLoading(false);
            console.log("Global AI models loaded and ready.");
        } catch (err) {
            console.error("Failed to load global AI models:", err);
            setModelError("Failed to initialize offline AI models. Please check your internet connection.");
            setModelLoading(false);
        }
    }, [modelLoading]);

    const classifyImage = useCallback(async (imageElement: HTMLImageElement, selectedCrop: CropType = 'tomato'): Promise<ClassificationResult> => {
        const activeModel = model || globalMobileNet;
        if (!activeModel) {
            return { isPlant: false, predictions: [], error: "Classifier model not initialized yet." };
        }

        try {
            // 1. MobileNet Classification
            const predictions = await activeModel.classify(imageElement);

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

            const rejectKeywords = [
                'person', 'human', 'face', 'selfie', 'man', 'woman', 'child', 'guy', 'lady', 'boy', 'girl',
                'groom', 'jersey', 't-shirt', 'sweatshirt', 'cardigan', 'suit', 'coat', 'jacket', 'dress', 'clothing',
                'cellular telephone', 'handheld computer', 'smartphone', 'phone', 'computer', 'monitor', 'screen', 'laptop',
                'hand', 'finger', 'arm', 'leg', 'body', 'skin', 'mirror'
            ];

            const topPredictions = predictions.slice(0, 5);
            const isArtificial = topPredictions.some(p =>
                artificialKeywords.some(keyword => p.className.toLowerCase().includes(keyword))
            );

            // 2. Custom Model Classification
            let customPredictions: { className: string; probability: number }[] | undefined;
            const activeCustomModels = { ...customModels, ...globalCustomModels };
            const targetModel = activeCustomModels[selectedCrop];

            if (targetModel) {
                try {
                    customPredictions = await targetModel.predict(imageElement);
                    customPredictions.sort((a, b) => b.probability - a.probability);
                } catch (e) {
                    console.error(`${selectedCrop} model prediction failed`, e);
                }
            }

            const hasPlantKeyword = predictions.slice(0, 5).some(p =>
                plantKeywords.some(keyword => p.className.toLowerCase().includes(keyword))
            );

            const hasRejectKeyword = predictions.slice(0, 3).some(p =>
                rejectKeywords.some(keyword => p.className.toLowerCase().includes(keyword)) && 
                (p.probability > 0.65 || !hasPlantKeyword)
            );

            const isTMConfident = !!(customPredictions && customPredictions.length > 0 && (
                customPredictions[0].probability > 0.75 ||
                (customPredictions[0].probability > 0.35 && hasPlantKeyword)
            ));

            const isPlant = (!isArtificial && hasPlantKeyword && !hasRejectKeyword) || 
                            (!isArtificial && isTMConfident && !hasRejectKeyword);

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
        const activeCustomModels = { ...customModels, ...globalCustomModels };
        const modelsToRun = Object.entries(activeCustomModels).filter(([_, m]) => m !== null);
        
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

    const isCustomModelLoaded = Object.values(customModels).some(m => m !== null) || 
                               Object.values(globalCustomModels).some(m => m !== null);

    return (
        <ClassifierContext.Provider value={{
            model,
            customModels,
            modelLoading,
            modelError,
            isInitialized,
            isCustomModelLoaded,
            initializeModels,
            classifyImage,
            classifyAll
        }}>
            {children}
        </ClassifierContext.Provider>
    );
}

export function useClassifier() {
    const context = useContext(ClassifierContext);
    if (context === undefined) {
        throw new Error('useClassifier must be used within a ClassifierProvider');
    }
    return context;
}
