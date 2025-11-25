import React from 'react';
import { NAV_ITEMS } from '../constants';

interface BottomNavProps {
  onNavClick: (id: string) => void;
  currentView: string;
}

const BottomNav: React.FC<BottomNavProps> = ({ onNavClick, currentView }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-app-nav border-t border-white/5 pb-2 pt-3 px-4 z-50 max-w-md mx-auto w-full">
      <div className="flex justify-between items-center">
        {NAV_ITEMS.map((item) => {
          // Determine if this item is active based on currentView
          const isActive = (item.id === 'home' && currentView === 'home') || 
                           (item.id === 'progress' && currentView === 'progress') ||
                           (item.id === 'leaderboard' && currentView === 'leaderboard');

          return (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id)}
              className={`flex flex-col items-center gap-1 min-w-[60px] ${
                isActive ? 'text-green-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <item.icon 
                className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;