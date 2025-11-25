import React, { useState } from 'react';
import { Bell, Search, ShieldCheck, User as UserIcon, Database, Loader2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { seedDatabase } from '../utils/seedData';

interface HeaderProps {
  user?: User | null;
  onAdminClick?: () => void;
  onProfileClick?: () => void;
}

// The specific Admin UID provided
const ADMIN_UID = "1DYoLukPV1bFYvixzb4PhoN2war2";

const Header: React.FC<HeaderProps> = ({ user, onAdminClick, onProfileClick }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const isAdmin = user?.uid === ADMIN_UID;

  const handleSeed = async () => {
     if (window.confirm("Add sample data to Firebase?")) {
        setSeeding(true);
        await seedDatabase();
        setSeeding(false);
        window.location.reload();
     }
  }

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
      <div className="flex items-center justify-between px-4 py-3">
        
        {/* Brand Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group select-none"
          onClick={() => window.location.reload()}
        >
          <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-tr from-green-600 to-emerald-400 rounded-xl shadow-lg shadow-green-900/20 group-hover:scale-105 transition-transform duration-300">
             <span className="text-white font-bold text-lg">d</span>
             <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-black rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
             </div>
          </div>
          <div className="flex flex-col justify-center">
             <span className="text-lg font-bold text-white leading-none tracking-tight font-sans">ddi<span className="text-green-500">app</span></span>
             <span className="text-[9px] text-gray-500 font-medium tracking-[0.2em] mt-0.5">LEARNING</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
           
           {/* Search Trigger */}
           <button 
             onClick={() => setShowSearch(!showSearch)}
             className={`p-2 rounded-full transition-all duration-300 ${showSearch ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
           >
             <Search className="w-5 h-5" strokeWidth={2} />
           </button>

           {/* Admin / Seed Tools */}
           {isAdmin && (
             <>
                <button 
                  onClick={handleSeed}
                  disabled={seeding}
                  title="Seed Database"
                  className="p-2 text-gray-500 hover:text-green-400 transition-colors hidden md:block"
                >
                   {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                </button>
                <button 
                  onClick={onAdminClick}
                  title="Admin Panel"
                  className="p-2 text-yellow-500/80 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-full transition-all"
                >
                   <ShieldCheck className="w-5 h-5" />
                </button>
             </>
           )}

           {/* Notification */}
           <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all relative">
             <Bell className="w-5 h-5" strokeWidth={2} />
             <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-[#121212]"></span>
           </button>

           {/* Profile */}
           <div 
             onClick={onProfileClick}
             className="ml-1 relative cursor-pointer group"
           >
              <div className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-br from-green-500 to-transparent group-hover:from-green-400 transition-all duration-500">
                <div className="w-full h-full rounded-full bg-[#121212] flex items-center justify-center overflow-hidden relative">
                   {user?.photoURL ? (
                     <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                   ) : (
                     <span className="text-green-500 font-bold text-sm">
                       {user?.displayName?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
                     </span>
                   )}
                </div>
              </div>
              {/* Status Indicator */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#121212] rounded-full"></div>
           </div>

        </div>
      </div>

      {/* Search Bar Dropdown */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${showSearch ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-4 pt-1">
           <div className="relative group">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-4 w-4 text-gray-500 group-focus-within:text-green-500 transition-colors" />
             </div>
             <input
               type="text"
               className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl leading-5 bg-white/5 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-green-500/50 focus:border-green-500/50 sm:text-sm transition-all"
               placeholder="বিষয় বা অধ্যায় খুঁজুন..."
             />
           </div>
        </div>
      </div>
    </header>
  );
};

export default Header;