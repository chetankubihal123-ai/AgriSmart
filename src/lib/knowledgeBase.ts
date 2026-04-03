export interface KnowledgeItem {
    keywords: string[];
    response: string;
    category: 'crop' | 'disease' | 'tech' | 'general';
}

export const farmingKnowledgeBase: KnowledgeItem[] = [
    // --- CROPS ---
    {
        keywords: ['wheat', 'grow wheat', 'wheat season'],
        response: "Wheat is a Rabi crop sown in winter (Oct-Dec) and harvested in spring (March-May). It requires cool weather for growth and warm weather for ripening. Ideal temperature: 10°C-15°C (sowing), 21°C-26°C (harvesting).",
        category: 'crop'
    },
    {
        keywords: ['rice', 'paddy', 'grow rice'],
        response: "Rice (Paddy) is a Kharif crop that requires high temperature (25°C+) and heavy rainfall (100cm+). It grows best in clayey loam soil that can retain water.",
        category: 'crop'
    },
    {
        keywords: ['corn', 'maize', 'corn fertilizer'],
        response: "Corn (Maize) needs well-drained, fertile soil. It is a heavy feeder, so apply Nitrogen-rich fertilizer (Urea) at knee-high stage. Water deeply but avoid waterlogging.",
        category: 'crop'
    },
    {
        keywords: ['tomato', 'grow tomato'],
        response: "Tomatoes love sun! They need at least 6-8 hours of sunlight. Support plants with stakes to keep fruit off the ground. Watch out for Early Blight (brown spots on leaves).",
        category: 'crop'
    },
    {
        keywords: ['potato', 'grow potato'],
        response: "Potatoes grow best in loose, well-drained sandy loam soil. Hill soil around the base of the plant as it grows to protect tubers from sunlight (green potatoes are toxic!).",
        category: 'crop'
    },
    {
        keywords: ['crop', 'what is crop', 'agriculture', 'farming', 'define crop'],
        response: "A crop is a plant or animal product that can be grown and harvested extensively for profit or subsistence. In agriculture, crops are typically divided into food crops (wheat, rice), feed crops, fiber crops (cotton), and oil crops.",
        category: 'general'
    },

    // --- DISEASES ---
    {
        keywords: ['blight', 'early blight', 'brown spots'],
        response: "Early Blight appears as concentric 'target board' brown spots on leaves. Control it by rotating crops, keeping leaves dry while watering, and using copper-based fungicides if severe.",
        category: 'disease'
    },
    {
        keywords: ['rust', 'leaf rust', 'orange powder'],
        response: "Leaf Rust appears as orange/reddish powdery pustules on leaves (common in Wheat). planted resistant varieties. If infected, apply sulfur or propiconazole fungicides immediately.",
        category: 'disease'
    },
    {
        keywords: ['yellow leaf', 'turning yellow', 'yellowing'],
        response: "Yellowing leaves (Chlorosis) often indicate Nitrogen deficiency or over-watering. Check if the soil is too soggy. If dry, apply a nitrogen-rich fertilizer like Urea or Compost.",
        category: 'disease'
    },
    {
        keywords: ['pest', 'insects', 'bugs', 'aphids'],
        response: "For common pests like Aphids, try spraying a Neem Oil solution (organic) first. For caterpillars or borers, you may need specific pesticides like Emamectin benzoate, but always check safety periods.",
        category: 'disease'
    },

    // --- GENERAL TIPS ---
    {
        keywords: ['fertilizer', 'npk', 'soil'],
        response: "The standard fertilizer ratio is N-P-K (Nitrogen, Phosphorus, Potassium). Leafy crops need more N, fruiting crops need more P and K. Always do a soil test before applying heavy chemicals.",
        category: 'general'
    },
    {
        keywords: ['water', 'irrigation', 'how much water'],
        response: "Most crops prefer deep, infrequent watering rather than daily shallow sprinkling. Drip irrigation is the most water-efficient method, saving up to 50% water compared to flood irrigation.",
        category: 'general'
    },
    {
        keywords: ['organic', 'compost', 'manure'],
        response: "Organic farming improves soil health long-term. Vermicompost and cow manure are excellent natural fertilizers. Crop rotation is also key to preventing soil depletion.",
        category: 'general'
    },
    {
        keywords: ['weather', 'rain', 'forecast'],
        response: "You can check the specific 'Weather' tab in this dashboard for a 5-day forecast tailored to your farm's location.",
        category: 'general'
    },
    {
        keywords: ['subsidy', 'scheme', 'government', 'loan'],
        response: "Government schemes vary by region. Common ones include PM-KISAN (income support) and Soil Health Card scheme. Contact your local Krishi Vigyan Kendra (KVK) for current details.",
        category: 'general'
    },
    {
        keywords: ['hello', 'hi', 'hey', 'start'],
        response: "Hello! I am AgriBot. Ask me about growing crops (wheat, rice), treating diseases (blight, rust), or general farming tips!",
        category: 'general'
    }
];

export function findBestMatch(query: string): string | null {
    const lowerQuery = query.toLowerCase();

    // Scramble through knowledge base to find the best match
    let bestMatch: KnowledgeItem | null = null;
    let maxScore = 0;

    farmingKnowledgeBase.forEach(item => {
        let score = 0;
        item.keywords.forEach(keyword => {
            if (lowerQuery.includes(keyword)) {
                score += keyword.length; // Weigh longer keyword matches higher
            }
        });

        if (score > maxScore) {
            maxScore = score;
            bestMatch = item;
        }
    });

    return maxScore > 0 && bestMatch ? (bestMatch as KnowledgeItem).response : null;
}
