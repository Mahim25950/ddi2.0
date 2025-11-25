import React, { useEffect, useState } from 'react';
import { ArrowLeft, PlayCircle, Lock, FileText, Bookmark, Sigma, BookOpen } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Subject, Chapter } from '../types';

interface ChapterSelectionProps {
  subject: Subject;
  onBack: () => void;
  onSelectChapter: (chapter: Chapter) => void;
  isQuickRevision?: boolean;
  isFormulaMode?: boolean;
  isLessonMode?: boolean;
}

const ChapterSelection: React.FC<ChapterSelectionProps> = ({ 
  subject, 
  onBack, 
  onSelectChapter, 
  isQuickRevision = false,
  isFormulaMode = false,
  isLessonMode = false
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        // Query chapters where subjectId matches the selected subject's ID
        const q = query(
          collection(db, 'chapters'), 
          where('subjectId', '==', subject.id)
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedChapters = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Chapter[];
        
        setChapters(fetchedChapters);
      } catch (error) {
        console.error("Error fetching chapters:", (error as any).message);
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [subject.id]);

  const getActionIcon = (chapter: Chapter) => {
    if (!isQuickRevision && !isFormulaMode && !isLessonMode && chapter.isLocked) {
      return <Lock className="w-5 h-5 text-gray-600" />;
    }
    if (isFormulaMode) {
      return <Sigma className="w-6 h-6 text-pink-500" />;
    }
    if (isLessonMode) {
      return <BookOpen className="w-6 h-6 text-blue-500" />;
    }
    if (isQuickRevision) {
      return <PlayCircle className="w-6 h-6 text-yellow-500" />;
    }
    return <PlayCircle className="w-6 h-6 text-green-500" />;
  };

  const getActionText = () => {
    if (isQuickRevision) return "Bookmarked Only";
    if (isFormulaMode) return "সূত্র দেখুন";
    if (isLessonMode) return "টপিক দেখুন";
    return "MCQ প্র্যাকটিস";
  };

  const getActionTextIcon = () => {
    if (isQuickRevision) return <Bookmark className="w-3 h-3 text-yellow-500 fill-yellow-500" />;
    if (isFormulaMode) return <Sigma className="w-3 h-3 text-pink-500" />;
    if (isLessonMode) return <BookOpen className="w-3 h-3 text-blue-500" />;
    return <FileText className="w-3 h-3 text-gray-500" />;
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-300 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 mt-2">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2"
        >
           <ArrowLeft className="w-6 h-6 text-gray-400 hover:text-white" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {subject.title}
            {isQuickRevision && <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded-md">Revision</span>}
            {isFormulaMode && <span className="text-xs px-2 py-1 bg-pink-500/20 text-pink-500 rounded-md">Formula</span>}
            {isLessonMode && <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-500 rounded-md">Lesson</span>}
          </h2>
          <p className="text-gray-400 text-xs">অধ্যায়সমূহ</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-app-card rounded-xl p-4 flex items-center justify-between border border-white/5 animate-pulse">
               <div className="flex items-center gap-4 w-full">
                 <div className="w-10 h-10 rounded-full bg-white/10 shrink-0"></div>
                 <div className="space-y-2 w-full">
                   <div className="h-4 w-1/2 bg-white/10 rounded"></div>
                   <div className="h-3 w-1/3 bg-white/5 rounded"></div>
                 </div>
               </div>
            </div>
          ))}
        </div>
      ) : chapters.length === 0 ? (
        <div className="text-center py-10 bg-app-card rounded-xl border border-white/5">
          <p className="text-gray-400">এই বিষয়ে কোনো অধ্যায় পাওয়া যায়নি।</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, index) => (
            <div 
              key={chapter.id}
              onClick={() => {
                // Allow access if unlocked OR if in Revision/Formula/Lesson mode
                if (!chapter.isLocked || isQuickRevision || isFormulaMode || isLessonMode) {
                  onSelectChapter(chapter);
                }
              }}
              className={`bg-app-card rounded-xl p-4 flex items-center justify-between border border-white/5 transition-all ${
                (!isQuickRevision && !isFormulaMode && !isLessonMode && chapter.isLocked) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#252525] cursor-pointer active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  (!isQuickRevision && !isFormulaMode && !isLessonMode && chapter.isLocked) 
                    ? 'bg-gray-800 text-gray-500' 
                    : isFormulaMode 
                      ? 'bg-pink-500/10 text-pink-500' 
                      : isLessonMode
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-green-500/10 text-green-500'
                }`}>
                  <span className="font-bold text-sm">{index + 1}</span>
                </div>
                
                <div>
                  <h3 className="text-gray-100 font-medium text-sm">{chapter.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getActionTextIcon()}
                    <span className={`text-[10px] ${isQuickRevision ? 'text-yellow-500' : isFormulaMode ? 'text-pink-500' : isLessonMode ? 'text-blue-500' : 'text-gray-500'}`}>
                      {getActionText()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {getActionIcon(chapter)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChapterSelection;