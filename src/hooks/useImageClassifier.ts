import { useClassifier, ClassificationResult, CropType } from '../contexts/ClassifierContext';

export type { ClassificationResult, CropType };

export function useImageClassifier() {
    const context = useClassifier();
    
    return {
        model: context.model,
        modelLoading: context.modelLoading,
        modelError: context.modelError,
        classifyImage: context.classifyImage,
        classifyAll: context.classifyAll,
        initializeModels: context.initializeModels,
        isCustomModelLoaded: context.isCustomModelLoaded
    };
}
