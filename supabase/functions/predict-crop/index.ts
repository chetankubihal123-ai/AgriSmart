import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CropDataInput {
  crop_type: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph_level: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  soil_moisture: number;
}

interface PredictionResult {
  health_status: string;
  health_confidence: number;
  yield_estimate: number;
  yield_confidence: number;
  risk_factors: string[];
}

interface RecommendationResult {
  fertilizer_type: string;
  fertilizer_quantity: number;
  irrigation_schedule: string;
  irrigation_amount: number;
  preventive_measures: string;
  optimal_conditions: Record<string, unknown>;
}

function analyzeCropHealth(data: CropDataInput): PredictionResult {
  const risks: string[] = [];
  let healthScore = 100;

  if (data.temperature < 15 || data.temperature > 35) {
    risks.push("Temperature outside optimal range");
    healthScore -= 20;
  }

  if (data.humidity < 40 || data.humidity > 80) {
    risks.push("Humidity levels not ideal");
    healthScore -= 15;
  }

  if (data.ph_level < 5.5 || data.ph_level > 7.5) {
    risks.push("Soil pH not optimal");
    healthScore -= 15;
  }

  if (data.soil_moisture < 30 || data.soil_moisture > 70) {
    risks.push("Soil moisture not ideal");
    healthScore -= 15;
  }

  if (data.nitrogen < 20) {
    risks.push("Low nitrogen levels");
    healthScore -= 10;
  }

  if (data.phosphorus < 15) {
    risks.push("Low phosphorus levels");
    healthScore -= 10;
  }

  if (data.potassium < 15) {
    risks.push("Low potassium levels");
    healthScore -= 10;
  }

  let health_status = "Healthy";
  if (healthScore < 50) {
    health_status = "Critical";
  } else if (healthScore < 70) {
    health_status = "Warning";
  }

  const yieldBase = 5000;
  const tempFactor = Math.max(0.5, Math.min(1, 1 - Math.abs(data.temperature - 25) / 25));
  const humidityFactor = Math.max(0.5, Math.min(1, 1 - Math.abs(data.humidity - 60) / 60));
  const nutrientFactor = Math.max(0.5, Math.min(1, (data.nitrogen + data.phosphorus + data.potassium) / 150));
  const moistureFactor = Math.max(0.5, Math.min(1, data.soil_moisture / 100));

  const yield_estimate = Math.round(
    yieldBase * tempFactor * humidityFactor * nutrientFactor * moistureFactor
  );

  return {
    health_status,
    health_confidence: healthScore,
    yield_estimate,
    yield_confidence: Math.round((tempFactor + humidityFactor + nutrientFactor + moistureFactor) * 25),
    risk_factors: risks,
  };
}

function generateRecommendations(data: CropDataInput, prediction: PredictionResult): RecommendationResult {
  let fertilizer_type = "Balanced NPK (10-10-10)";
  let fertilizer_quantity = 50;

  if (data.nitrogen < 30) {
    fertilizer_type = "Nitrogen-rich (20-10-10)";
    fertilizer_quantity = 60;
  } else if (data.phosphorus < 20) {
    fertilizer_type = "Phosphorus-rich (10-20-10)";
    fertilizer_quantity = 55;
  } else if (data.potassium < 20) {
    fertilizer_type = "Potassium-rich (10-10-20)";
    fertilizer_quantity = 55;
  }

  let irrigation_schedule = "Every 3 days";
  let irrigation_amount = 1000;

  if (data.soil_moisture < 40) {
    irrigation_schedule = "Daily";
    irrigation_amount = 1500;
  } else if (data.soil_moisture > 65) {
    irrigation_schedule = "Every 5 days";
    irrigation_amount = 800;
  }

  let preventive_measures = "Standard crop maintenance practices.";

  if (prediction.health_status === "Critical") {
    preventive_measures = `URGENT ACTION REQUIRED:
- Immediately assess and correct nutrient deficiencies
- Check for pest and disease signs
- Consider soil testing for comprehensive analysis
- Consult agricultural expert if conditions worsen
- Monitor daily for changes`;
  } else if (prediction.health_status === "Warning") {
    preventive_measures = `Preventive actions recommended:
- Monitor crop conditions closely
- Address nutrient imbalances gradually
- Maintain consistent irrigation schedule
- Watch for early signs of stress or disease
- Consider foliar feeding for quick nutrient uptake`;
  } else {
    preventive_measures = `Maintenance recommendations:
- Continue current management practices
- Regular monitoring for any changes
- Maintain optimal soil moisture levels
- Apply fertilizers as scheduled
- Prepare for upcoming growth stages`;
  }

  const optimal_conditions = {
    temperature: "20-30°C",
    humidity: "50-70%",
    ph_level: "6.0-7.0",
    nitrogen: "30-50 kg/ha",
    phosphorus: "20-40 kg/ha",
    potassium: "20-40 kg/ha",
    soil_moisture: "40-60%",
  };

  return {
    fertilizer_type,
    fertilizer_quantity,
    irrigation_schedule,
    irrigation_amount,
    preventive_measures,
    optimal_conditions,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { cropDataId, cropData } = await req.json();

    const prediction = analyzeCropHealth(cropData);

    const { data: predictionData, error: predError } = await supabase
      .from("predictions")
      .insert({
        crop_data_id: cropDataId,
        health_status: prediction.health_status,
        health_confidence: prediction.health_confidence,
        yield_estimate: prediction.yield_estimate,
        yield_confidence: prediction.yield_confidence,
        risk_factors: prediction.risk_factors,
      })
      .select()
      .single();

    if (predError) throw predError;

    const recommendation = generateRecommendations(cropData, prediction);

    const { error: recError } = await supabase
      .from("recommendations")
      .insert({
        prediction_id: predictionData.id,
        fertilizer_type: recommendation.fertilizer_type,
        fertilizer_quantity: recommendation.fertilizer_quantity,
        irrigation_schedule: recommendation.irrigation_schedule,
        irrigation_amount: recommendation.irrigation_amount,
        preventive_measures: recommendation.preventive_measures,
        optimal_conditions: recommendation.optimal_conditions,
      });

    if (recError) throw recError;

    return new Response(
      JSON.stringify({
        success: true,
        prediction: predictionData,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
