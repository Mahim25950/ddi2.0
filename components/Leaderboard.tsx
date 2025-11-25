import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trophy, User as UserIcon, Crown, Medal, Loader2 } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';

interface LeaderboardProps {
  onBack: () => void;
  currentUser: User;
}

interface LeaderboardUser {
  id: string;
  displayName: string;
  photoURL?: string;
  totalScore: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack, currentUser }) => {
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        // Query users sorted by totalScore descending
        const q = query(
          collection(db, 'users'),
          orderBy('totalScore', 'desc'),
          limit(50)
        );
        
        const snapshot = await getDocs(q);
        const usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LeaderboardUser[];

        // Filter out users with no score if any (though order by should handle it)
        const activeUsers = usersData.filter(u => u.totalScore > 0);
        
        setTopUsers(activeUsers);

        // Find current user rank
        const rank = activeUsers.findIndex(u => u.id === currentUser.uid);
        if (rank !== -1) {
          setUserRank(rank + 1);
        }

      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentUser.uid]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-400 fill-yellow-400" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-300 fill-gray-300" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600 fill-amber-600" />;
    return <span className="text-gray-500 font-bold w-6 text-center">{index + 1}</span>;
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-300 pb-24 min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 mt-2">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2"
        >
           <ArrowLeft className="w-6 h-6 text-gray-400 hover:text-white" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            লিডারবোর্ড
          </h2>
          <p className="text-gray-400 text-xs">Top Performers</p>
        </div>
      </div>

      {/* Current User Stats Card (if active) */}
      {userRank && (
        <div className="bg-gradient-to-r from-green-900/40 to-black p-4 rounded-2xl border border-green-500/30 mb-6 flex items-center justify-between shadow-lg">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-green-500 p-0.5">
                 <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="You" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-green-500 font-bold">
                        {currentUser.displayName?.[0] || <UserIcon className="w-5 h-5" />}
                      </div>
                    )}
                 </div>
              </div>
              <div>
                 <p className="text-green-400 text-xs font-bold uppercase tracking-wider">Your Rank</p>
                 <p className="text-white font-bold text-lg">#{userRank}</p>
              </div>
           </div>
           <div className="text-right">
              <p className="text-gray-400 text-xs">Total Score</p>
              <p className="text-yellow-400 font-bold text-xl">
                {topUsers.find(u => u.id === currentUser.uid)?.totalScore || 0}
              </p>
           </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
           <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-2" />
           <p className="text-gray-500 text-sm">Loading rankings...</p>
        </div>
      ) : topUsers.length === 0 ? (
        <div className="bg-app-card rounded-2xl p-8 text-center border border-white/5">
           <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
           <h3 className="text-white font-bold">No Data Yet</h3>
           <p className="text-gray-500 text-sm mt-1">Start practicing to appear on the leaderboard!</p>
        </div>
      ) : (
        <div className="bg-app-card rounded-2xl border border-white/5 overflow-hidden">
           {topUsers.map((user, index) => (
             <div 
               key={user.id} 
               className={`flex items-center justify-between p-4 border-b border-white/5 last:border-0 ${
                 user.id === currentUser.uid ? 'bg-green-500/10' : 'hover:bg-white/5'
               } transition-colors`}
             >
                <div className="flex items-center gap-4">
                   <div className="w-8 flex justify-center">
                      {getRankIcon(index)}
                   </div>
                   <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                           <UserIcon className="w-5 h-5" />
                        </div>
                      )}
                   </div>
                   <div className="flex flex-col">
                      <span className={`text-sm font-bold ${user.id === currentUser.uid ? 'text-green-400' : 'text-white'}`}>
                        {user.displayName || 'Anonymous'}
                      </span>
                      {index < 3 && (
                         <span className="text-[10px] text-yellow-500/80">Top Performer</span>
                      )}
                   </div>
                </div>
                
                <div className="bg-white/5 px-3 py-1 rounded-full border border-white/5">
                   <span className="text-sm font-bold text-yellow-400">{user.totalScore}</span>
                   <span className="text-[10px] text-gray-500 ml-1">pts</span>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;