import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Farm } from '../lib/types';

const CROP_TYPES = [
  'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane',
  'Soybean', 'Potato', 'Tomato', 'Onion', 'Other'
];

interface DataInputProps {
  farm: Farm;
  onDataAdded: () => void;
}

export function DataInput({ farm, onDataAdded }: DataInputProps) {
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [formData, setFormData] = useState({
    crop_type: '',
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    ph_level: '7.0',
    temperature: '',
    humidity: '',
    rainfall: '',
    soil_moisture: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: cropData, error: cropError } = await supabase
        .from('crop_data')
        .insert({
          farm_id: farm.id,
          crop_type: formData.crop_type,
          nitrogen: parseFloat(formData.nitrogen),
          phosphorus: parseFloat(formData.phosphorus),
          potassium: parseFloat(formData.potassium),
          ph_level: parseFloat(formData.ph_level),
          temperature: parseFloat(formData.temperature),
          humidity: parseFloat(formData.humidity),
          rainfall: parseFloat(formData.rainfall),
          soil_moisture: parseFloat(formData.soil_moisture),
        })
        .select()
        .single();

      if (cropError) throw cropError;

      setPredicting(true);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/predict-crop`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cropDataId: cropData.id, cropData: formData }),
      });

      if (!response.ok) {
        throw new Error('Prediction failed');
      }

      setFormData({
        crop_type: '',
        nitrogen: '',
        phosphorus: '',
        potassium: '',
        ph_level: '7.0',
        temperature: '',
        humidity: '',
        rainfall: '',
        soil_moisture: '',
      });

      onDataAdded();
      alert('Data added and predictions generated successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Error adding data. Please try again.');
    } finally {
      setLoading(false);
      setPredicting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Crop Data</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="crop_type" className="block text-sm font-medium text-gray-700 mb-2">
              Crop Type
            </label>
            <select
              id="crop_type"
              name="crop_type"
              value={formData.crop_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select crop type</option>
              {CROP_TYPES.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
              Temperature (°C)
            </label>
            <input
              type="number"
              id="temperature"
              name="temperature"
              value={formData.temperature}
              onChange={handleChange}
              step="0.1"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., 25.5"
            />
          </div>

          <div>
            <label htmlFor="humidity" className="block text-sm font-medium text-gray-700 mb-2">
              Humidity (%)
            </label>
            <input
              type="number"
              id="humidity"
              name="humidity"
              value={formData.humidity}
              onChange={handleChange}
              step="0.1"
              min="0"
              max="100"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., 65"
            />
          </div>

          <div>
            <label htmlFor="rainfall" className="block text-sm font-medium text-gray-700 mb-2">
              Rainfall (mm)
            </label>
            <input
              type="number"
              id="rainfall"
              name="rainfall"
              value={formData.rainfall}
              onChange={handleChange}
              step="0.1"
              min="0"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., 100"
            />
          </div>

          <div>
            <label htmlFor="soil_moisture" className="block text-sm font-medium text-gray-700 mb-2">
              Soil Moisture (%)
            </label>
            <input
              type="number"
              id="soil_moisture"
              name="soil_moisture"
              value={formData.soil_moisture}
              onChange={handleChange}
              step="0.1"
              min="0"
              max="100"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., 45"
            />
          </div>

          <div>
            <label htmlFor="ph_level" className="block text-sm font-medium text-gray-700 mb-2">
              pH Level
            </label>
            <input
              type="number"
              id="ph_level"
              name="ph_level"
              value={formData.ph_level}
              onChange={handleChange}
              step="0.1"
              min="0"
              max="14"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., 6.5"
            />
          </div>

          <div>
            <label htmlFor="nitrogen" className="block text-sm font-medium text-gray-700 mb-2">
              Nitrogen (kg/ha)
            </label>
            <input
              type="number"
              id="nitrogen"
              name="nitrogen"
              value={formData.nitrogen}
              onChange={handleChange}
              step="0.1"
              min="0"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., 40"
            />
          </div>

          <div>
            <label htmlFor="phosphorus" className="block text-sm font-medium text-gray-700 mb-2">
              Phosphorus (kg/ha)
            </label>
            <input
              type="number"
              id="phosphorus"
              name="phosphorus"
              value={formData.phosphorus}
              onChange={handleChange}
              step="0.1"
              min="0"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., 30"
            />
          </div>

          <div>
            <label htmlFor="potassium" className="block text-sm font-medium text-gray-700 mb-2">
              Potassium (kg/ha)
            </label>
            <input
              type="number"
              id="potassium"
              name="potassium"
              value={formData.potassium}
              onChange={handleChange}
              step="0.1"
              min="0"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., 20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || predicting}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : predicting ? 'Generating Predictions...' : 'Add Data & Generate Predictions'}
        </button>
      </form>
    </div>
  );
}
