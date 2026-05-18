import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex justify-center items-center p-4 bg-red-600/95 backdrop-blur-md text-white shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full animate-pulse">
              <WifiOff className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm sm:text-base">No Internet Connection</span>
              <span className="text-xs text-red-100">Please check your network settings.</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="ml-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 text-xs font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Retry</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
