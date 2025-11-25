import React from 'react';
import { MenuItem } from '../types';

interface MenuCardProps {
  item: MenuItem;
  onClick?: () => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ item, onClick }) => {
  const Icon = item.icon;

  return (
    <div 
      onClick={onClick}
      className="bg-app-card rounded-2xl p-4 flex flex-col items-center justify-center aspect-square hover:bg-neutral-800 transition-colors cursor-pointer group shadow-sm border border-white/5 active:scale-95 duration-100"
    >
      <div className={`mb-3 transform group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-8 h-8 ${item.color}`} strokeWidth={2.5} />
      </div>
      <span className="text-gray-300 text-sm font-medium text-center leading-tight select-none">
        {item.title}
      </span>
    </div>
  );
};

export default MenuCard;