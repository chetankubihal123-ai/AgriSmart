import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { Sprout, BadgeCheck, ArrowRight, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

const HOST_PIN = '123456';

export const RoleSelection: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'expert' | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { setRole } = useRole();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleRoleSelect = (role: 'farmer' | 'expert') => {
    setSelectedRole(role);
    setError('');
    
    if (role === 'farmer') {
      setRole('farmer');
      navigate('/dashboard');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === HOST_PIN) {
      setRole('expert');
      navigate('/dashboard');
    } else {
      setError('Invalid PIN. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      <div className="absolute top-6 right-6">
        <LanguageSelector />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
            <Sprout className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          {t('role.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('role.subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 md:py-10 px-4 shadow sm:rounded-lg sm:px-10">
          
          {!selectedRole || selectedRole === 'farmer' ? (
            <div className="space-y-6">
              <button
                onClick={() => handleRoleSelect('farmer')}
                className="w-full flex items-center justify-between px-6 py-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                    <Sprout className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4 text-left">
                    <h3 className="text-lg font-medium text-gray-900">{t('role.farmer')}</h3>
                    <p className="text-sm text-gray-500">{t('role.farmerDesc')}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-500 transition-colors" />
              </button>

              <button
                onClick={() => handleRoleSelect('expert')}
                className="w-full flex items-center justify-between px-6 py-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <BadgeCheck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4 text-left">
                    <h3 className="text-lg font-medium text-gray-900">{t('role.expert')}</h3>
                    <p className="text-sm text-gray-500">{t('role.expertDesc')}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center mb-6">
                <button 
                  onClick={() => {
                    setSelectedRole(null);
                    setError('');
                    setPin('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  &larr; {t('role.backToRoles')}
                </button>
              </div>
              
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                  <ShieldAlert className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">{t('role.enterPin')}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('role.restricted')}
                </p>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label htmlFor="pin" className="sr-only">
                    PIN
                  </label>
                  <input
                    id="pin"
                    name="pin"
                    type="password"
                    maxLength={6}
                    required
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-lg text-center tracking-[0.5em]"
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  {t('role.verifyPin')}
                </button>
              </form>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};
