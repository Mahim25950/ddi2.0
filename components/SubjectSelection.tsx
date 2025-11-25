import React, { useEffect, useState } from 'react';
import { ArrowLeft, Book, Bookmark, Sigma, Search, X, Library } from 'lucide-react';
import { collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { Subject } from '../types';

interface SubjectSelectionProps {
  onBack: () => void;
  onSelectSubject: (subject: Subject) => void;
  userClass: string;
  isQuickRevision?: boolean;
  isFormulaMode?: boolean;
  isLessonMode?: boolean;
}

const SubjectSelection: React.FC<SubjectSelectionProps> = ({ 
  onBack, 
  onSelectSubject, 
  userClass, 
  isQuickRevision = false,
  isFormulaMode = false,
  isLessonMode = false
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'started' | 'new'>('all');

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'subjects'), where('classLevel', '==', userClass));
        const querySnapshot = await getDocs(q);
        
        const fetchedSubjects = await Promise.all(querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const subjectId = doc.id;

          try {
            const chaptersQuery = query(
              collection(db, 'chapters'), 
              where('subjectId', '==', subjectId)
            );
            const countSnapshot = await getCountFromServer(chaptersQuery);
            const realChapterCount = countSnapshot.data().count;

            return {
              id: subjectId,
              ...data,
              chapterCount: realChapterCount
            } as Subject;
          } catch (err: any) {
            console.error(`Error counting chapters: ${err.message}`);
            return {
              id: subjectId,
              ...data,
              chapterCount: data.chapterCount || 0
            } as Subject;
          }
        }));
        
        setSubjects(fetchedSubjects);
      } catch (error: any) {
        console.error("Error fetching subjects:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [userClass]);

  // --- Derived State for Filtering ---
  const filteredSubjects = subjects.filter(sub => {
    const matchesSearch = sub.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === 'started') matchesFilter = sub.progress > 0;
    if (activeFilter === 'new') matchesFilter = sub.progress === 0;

    return matchesSearch && matchesFilter;
  });

  // --- Dynamic Styling ---
  const getThemeColor = () => {
    if (isQuickRevision) return 'text-yellow-500';
    if (isFormulaMode) return 'text-pink-500';
    if (isLessonMode) return 'text-blue-500';
    return 'text-green-500';
  };
  
  const getThemeBg = () => {
      if (isQuickRevision) return 'bg-yellow-500';
      if (isFormulaMode) return 'bg-pink-500';
      if (isLessonMode) return 'bg-blue-500';
      return 'bg-green-500';
  };

  const getPageTitle = () => {
    if (isQuickRevision) return "দ্রুত রিভিশন";
    if (isFormulaMode) return "সূত্রসমূহ (Formulas)";
    if (isLessonMode) return "লেসন ও টপিক";
    return "বিষয় নির্বাচন";
  };

  const getPageIcon = () => {
    if (isQuickRevision) return <Bookmark className="w-6 h-6 text-yellow-500 fill-yellow-500" />;
    if (isFormulaMode) return <Sigma className="w-6 h-6 text-pink-500" />;
    if (isLessonMode) return <Library className="w-6 h-6 text-blue-500" />;
    return <Book className="w-6 h-6 text-green-500" />;
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-300 pb-24 min-h-full flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-6 mt-2">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-full border border-white/5">
                 {getPageIcon()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{getPageTitle()}</h2>
                <p className="text-gray-400 text-xs">{userClass}</p>
              </div>
            </div>
            <button 
              onClick={onBack} 
              className="p-2 hover:bg-white/10 rounded-full transition-colors -mr-2"
              aria-label="Go back"
            >
               <ArrowLeft className="w-6 h-6 text-gray-400 hover:text-white" />
            </button>
         </div>

         {/* Search & Filter Bar */}
         <div className="flex items-center gap-3">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
               <input 
                  type="text" 
                  placeholder="Search subjects..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-app-card border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
               />
               {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
                  >
                     <X className="w-3 h-3 text-gray-400" />
                  </button>
               )}
            </div>
         </div>

         {/* Filter Tabs */}
         <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button 
               onClick={() => setActiveFilter('all')}
               className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${activeFilter === 'all' ? `bg-white text-black border-white` : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
            >
               All Subjects
            </button>
            <button 
               onClick={() => setActiveFilter('started')}
               className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${activeFilter === 'started' ? `${getThemeBg()} text-black border-transparent font-bold` : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
            >
               In Progress
            </button>
            <button 
               onClick={() => setActiveFilter('new')}
               className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${activeFilter === 'new' ? `bg-gray-700 text-white border-gray-600` : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
            >
               Not Started
            </button>
         </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-app-card rounded-2xl p-5 border border-white/5 h-32 animate-pulse flex flex-col justify-between">
              <div className="flex justify-between items-start">
                 <div className="w-10 h-10 bg-white/10 rounded-xl"></div>
                 <div className="w-16 h-4 bg-white/10 rounded"></div>
              </div>
              <div className="w-2/3 h-5 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
           <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-600" />
           </div>
           <p className="text-lg font-medium text-gray-300">No subjects found</p>
           <p className="text-xs mt-1">Try adjusting your search or filters</p>
           {activeFilter !== 'all' && (
              <button 
                onClick={() => setActiveFilter('all')} 
                className="mt-4 text-green-500 text-sm hover:underline"
              >
                 Clear filters
              </button>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredSubjects.map((subject) => (
            <div 
              key={subject.id} 
              onClick={() => onSelectSubject(subject)}
              className={`group relative bg-app-card rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all active:scale-[0.98] cursor-pointer overflow-hidden shadow-lg`}
            >
              {/* Hover Gradient Effect */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-500 -mr-10 -mt-10 rounded-full blur-2xl ${isQuickRevision ? 'from-yellow-500' : isFormulaMode ? 'from-pink-500' : isLessonMode ? 'from-blue-500' : 'from-green-500'}`}></div>

              <div className="relative z-10">
                 <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl transition-colors ${
                        isQuickRevision ? 'bg-yellow-500/10 text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black' :
                        isFormulaMode ? 'bg-pink-500/10 text-pink-500 group-hover:bg-pink-500 group-hover:text-white' :
                        isLessonMode ? 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white' :
                        'bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-black'
                    }`}>
                       {isQuickRevision ? <Bookmark className="w-6 h-6" /> : isFormulaMode ? <Sigma className="w-6 h-6" /> : isLessonMode ? <Library className="w-6 h-6" /> : <Book className="w-6 h-6" />}
                    </div>
                    <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded-md text-gray-400 border border-white/5">
                       {subject.chapterCount} অধ্যায়
                    </span>
                 </div>

                 <h3 className="text-lg font-bold text-white mb-1 leading-tight">{subject.title}</h3>
                 
                 {/* Progress Section */}
                 <div className="mt-4">
                    <div className="flex justify-between text-[10px] mb-1.5">
                       <span className="text-gray-500 font-medium">Completed</span>
                       <span className={`font-bold ${getThemeColor()}`}>{subject.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                       <div 
                          className={`h-full rounded-full transition-all duration-500 ${getThemeBg()}`} 
                          style={{ width: `${subject.progress || 0}%` }}
                       ></div>
                    </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectSelection;