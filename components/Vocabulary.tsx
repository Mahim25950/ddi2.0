
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Star, 
  Lock, 
  Check, 
  X, 
  Volume2, 
  Trophy,
  Zap,
  Loader2,
  BookOpen,
  Gift,
  Crown,
  Settings2,
  RotateCcw
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { VocabularyWord } from '../types';

interface VocabularyProps {
  onBack: () => void;
}

// --- Constants ---
// Fallback words if DB is empty
const DEFAULT_VOCAB: VocabularyWord[] = [
  { en: "Abundance", bn: "প্রাচুর্য", pronunciation: "/əˈbʌndəns/", section: "Section 1", unit: "Unit 1" },
  { en: "Benevolent", bn: "পরোপকারী", pronunciation: "/bəˈnevələnt/", section: "Section 1", unit: "Unit 1" },
  { en: "Candid", bn: "স্পষ্টবাদী", pronunciation: "/ˈkændɪd/", section: "Section 1", unit: "Unit 1" },
  { en: "Diligent", bn: "পরিশ্রমী", pronunciation: "/ˈdɪlɪdʒənt/", section: "Section 1", unit: "Unit 2" },
  { en: "Empathy", bn: "সহমর্মিতা", pronunciation: "/ˈempəθi/", section: "Section 1", unit: "Unit 2" }
];

// --- Types ---
interface Level {
  id: number;
  title: string;
  sectionTitle: string;
  words: VocabularyWord[];
  status: 'locked' | 'active' | 'completed';
  stars: number; // 0-3
}

type ExerciseType = 'flashcard' | 'mcq' | 'matching' | 'spelling';

interface Question {
  type: ExerciseType;
  word: VocabularyWord;
  options?: string[]; // For MCQ
}

const Vocabulary: React.FC<VocabularyProps> = ({ onBack }) => {
  // Data State
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState(0); // Completed level index

  // View State
  const [currentView, setCurrentView] = useState<'map' | 'lesson'>('map');
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);

  useEffect(() => {
    const initVocabulary = async () => {
      try {
        // 1. Fetch Words
        const querySnapshot = await getDocs(collection(db, 'vocabulary'));
        let allWords = querySnapshot.docs.map(doc => ({
           id: doc.id,
           ...doc.data()
        })) as VocabularyWord[];

        if (allWords.length === 0) allWords = DEFAULT_VOCAB;

        // 2. Group words by Section and Unit
        // Map: Section -> Unit -> Words[]
        const grouped = new Map<string, Map<string, VocabularyWord[]>>();

        allWords.forEach(word => {
           const sec = word.section || 'General';
           const unit = word.unit || 'Unit 1';

           if (!grouped.has(sec)) grouped.set(sec, new Map());
           const unitMap = grouped.get(sec)!;
           
           if (!unitMap.has(unit)) unitMap.set(unit, []);
           unitMap.get(unit)!.push(word);
        });

        // 3. Flatten into ordered levels
        const flatLevels: Level[] = [];
        let levelCounter = 1;

        // Sort Sections Alphabetically (or use custom order if available later)
        const sortedSections = Array.from(grouped.keys()).sort();

        sortedSections.forEach(sec => {
           const unitMap = grouped.get(sec)!;
           const sortedUnits = Array.from(unitMap.keys()).sort(); // Sort units alphabetically
           
           sortedUnits.forEach(unit => {
              flatLevels.push({
                 id: levelCounter,
                 title: unit,
                 sectionTitle: sec,
                 words: unitMap.get(unit)!,
                 status: 'locked', // default
                 stars: 0
              });
              levelCounter++;
           });
        });
        
        // Sync with local storage for simple persistence
        const savedProgress = parseInt(localStorage.getItem('vocab_progress') || '0');
        setUserProgress(savedProgress);

        // Update statuses based on progress
        const updatedLevels = flatLevels.map((lvl, idx) => ({
           ...lvl,
           status: idx < savedProgress ? 'completed' : (idx === savedProgress ? 'active' : 'locked'),
           stars: idx < savedProgress ? 3 : 0
        }));

        setLevels(updatedLevels);

      } catch (error: any) {
        console.error("Init failed", error.message || String(error));
      } finally {
        setLoading(false);
      }
    };

    initVocabulary();
  }, []);

  const handleLevelClick = (level: Level) => {
    if (level.status === 'locked') return;
    setActiveLevel(level);
    setCurrentView('lesson');
  };

  const handleLessonComplete = (stars: number) => {
    if (!activeLevel) return;
    
    // Update Progress
    // activeLevel.id is 1-based index of the level in the flat array
    const completedLevelIndex = activeLevel.id; // e.g., 1
    const currentMax = userProgress; // e.g. 0 (nothing done)
    
    let nextProgress = currentMax;
    if (completedLevelIndex > currentMax) {
       nextProgress = completedLevelIndex;
       localStorage.setItem('vocab_progress', nextProgress.toString());
       setUserProgress(nextProgress);
    }

    setLevels(prev => prev.map(l => {
       // Mark current as completed
       if (l.id === activeLevel.id) {
          return { ...l, status: 'completed', stars: Math.max(l.stars, stars) };
       }
       // Unlock next
       if (l.id === activeLevel.id + 1) {
          // Only force to active if it was locked; if it was already completed, keep completed
          return l.status === 'locked' ? { ...l, status: 'active' } : l;
       }
       return l;
    }));

    setCurrentView('map');
    setActiveLevel(null);
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-green-500">
         <Loader2 className="w-10 h-10 animate-spin mb-4" />
         <p className="text-gray-400 font-medium">Loading path...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#121212] flex flex-col">
      
      {/* --- MAP VIEW --- */}
      {currentView === 'map' && (
        <>
           {/* Header - Sticky Green Banner */}
           <div className="sticky top-0 z-40 bg-[#121212] border-b border-white/5">
              <div className="bg-green-600 px-4 pt-4 pb-6 rounded-b-3xl shadow-lg shadow-green-900/20 relative overflow-hidden">
                 {/* Pattern Overlay */}
                 <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                 
                 <div className="relative z-10 flex justify-between items-start mb-2">
                    <button 
                       onClick={onBack} 
                       className="p-2 bg-black/20 rounded-xl hover:bg-black/30 text-white transition-colors"
                    >
                       <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-full">
                       <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                       <span className="text-xs font-bold text-white">{userProgress} Units Done</span>
                    </div>
                 </div>
                 
                 <div className="relative z-10 mt-2 text-center">
                    <p className="text-green-200 text-xs font-bold tracking-widest uppercase mb-1">Current Course</p>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">Vocabulary Path</h1>
                 </div>
              </div>
           </div>

           {/* Path Container */}
           <div className="flex-1 overflow-y-auto pb-32 pt-6 px-4 relative">
              {/* The Path Line (SVG Background) */}
              {/* Simplified visual connector: dashed line centered */}
              <div className="absolute left-1/2 top-0 bottom-0 w-2 -ml-1 border-l-4 border-dotted border-gray-800 pointer-events-none z-0"></div>

              <div className="relative z-10 flex flex-col items-center gap-8">
                 {levels.map((level, index) => {
                    // Zigzag logic
                    const xOffset = Math.sin(index) * 60;
                    
                    // Render Section Header if new section
                    const showSectionHeader = index === 0 || level.sectionTitle !== levels[index - 1].sectionTitle;

                    return (
                       <React.Fragment key={level.id}>
                          {showSectionHeader && (
                             <div className="w-full bg-gray-800/50 backdrop-blur-sm border-y border-white/5 py-3 px-4 my-4 text-center rounded-xl z-20">
                                <h3 className="text-green-400 font-bold uppercase tracking-wider text-sm">{level.sectionTitle}</h3>
                             </div>
                          )}
                          <LevelNode 
                             level={level} 
                             onClick={() => handleLevelClick(level)} 
                             xOffset={xOffset}
                          />
                       </React.Fragment>
                    );
                 })}
                 
                 {/* Final Trophy */}
                 <div className="mt-8 flex flex-col items-center animate-bounce bg-black/50 p-4 rounded-xl border border-yellow-500/30">
                    <Trophy className="w-16 h-16 text-yellow-500 drop-shadow-lg" />
                    <p className="text-yellow-500 font-bold mt-2">All Sections Complete!</p>
                 </div>
              </div>
           </div>
        </>
      )}

      {/* --- LESSON VIEW --- */}
      {currentView === 'lesson' && activeLevel && (
         <LessonEngine 
            level={activeLevel} 
            onComplete={handleLessonComplete}
            onExit={() => {
               if (window.confirm("Quit lesson? You will lose progress.")) {
                  setCurrentView('map');
               }
            }}
         />
      )}

    </div>
  );
};

// --- Sub-Component: Level Node (The Circular Button) ---
const LevelNode: React.FC<{ level: Level; onClick: () => void; xOffset: number }> = ({ level, onClick, xOffset }) => {
   // Status Styles
   const isActive = level.status === 'active';
   const isLocked = level.status === 'locked';
   const isCompleted = level.status === 'completed';

   let bgClass = 'bg-gray-700';
   let borderClass = 'border-gray-800';
   let iconColor = 'text-gray-500';
   
   if (isCompleted) {
      bgClass = 'bg-yellow-500';
      borderClass = 'border-yellow-700';
      iconColor = 'text-yellow-900';
   } else if (isActive) {
      bgClass = 'bg-green-500';
      borderClass = 'border-green-700';
      iconColor = 'text-white';
   }

   return (
      <div 
         className="relative flex flex-col items-center group my-2"
         style={{ transform: `translateX(${xOffset}px)` }}
      >
         {/* Floating Stars for Completed */}
         {isCompleted && (
            <div className="absolute -top-8 flex gap-1 animate-in zoom-in duration-300">
               {[...Array(level.stars)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-md" />
               ))}
            </div>
         )}
         
         {/* The Button */}
         <button
            onClick={onClick}
            disabled={isLocked}
            className={`
               w-20 h-20 rounded-full flex items-center justify-center relative
               border-b-[6px] active:border-b-0 active:translate-y-[6px] transition-all
               ${bgClass} ${borderClass}
               ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:brightness-110 shadow-xl'}
            `}
         >
            {/* Node Icon */}
            {isLocked ? (
               <Lock className={`w-8 h-8 ${iconColor}`} />
            ) : isCompleted ? (
               <Check className={`w-8 h-8 ${iconColor} stroke-[4px]`} />
            ) : (
               <Star className={`w-8 h-8 ${iconColor} fill-current animate-pulse`} />
            )}
            
            {/* Current Indicator Ring */}
            {isActive && (
               <div className="absolute -inset-3 border-4 border-green-500/30 rounded-full animate-ping pointer-events-none"></div>
            )}
         </button>

         {/* Level Title Badge */}
         <div className="mt-2 bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700 shadow-lg">
            <p className={`text-[10px] font-bold whitespace-nowrap ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
               {level.title}
            </p>
         </div>
      </div>
   );
};


// --- Sub-Component: Lesson Engine (The actual learning interface) ---

interface LessonEngineProps {
   level: Level;
   onComplete: (stars: number) => void;
   onExit: () => void;
}

const LessonEngine: React.FC<LessonEngineProps> = ({ level, onComplete, onExit }) => {
   const [queue, setQueue] = useState<Question[]>([]);
   const [currentIndex, setCurrentIndex] = useState(0);
   const [progress, setProgress] = useState(0); // 0 to 100
   const [hearts, setHearts] = useState(3);
   const [status, setStatus] = useState<'thinking' | 'correct' | 'wrong' | 'finished'>('thinking');
   const [selectedOption, setSelectedOption] = useState<string | null>(null);
   const [textInput, setTextInput] = useState('');
   
   // Audio feedback
   const successSound = useMemo(() => new Audio('https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3'), []);
   const errorSound = useMemo(() => new Audio('https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3'), []);

   // Init Queue
   useEffect(() => {
      // Build a lesson plan:
      const newQueue: Question[] = [];
      
      // Step 1: Intro Flashcards
      level.words.forEach(w => newQueue.push({ type: 'flashcard', word: w }));

      // Step 2: Practice Mix (Randomized)
      const practicePool: Question[] = [];
      level.words.forEach(w => {
         // MCQ: En -> Bn options
         const distractors = level.words.filter(d => d.id !== w.id).map(d => d.bn).sort(() => 0.5 - Math.random()).slice(0, 3);
         practicePool.push({ type: 'mcq', word: w, options: [w.bn, ...distractors].sort(() => 0.5 - Math.random()) });

         // Writing: Bn -> En
         practicePool.push({ type: 'spelling', word: w });
      });

      // Shuffle practice pool
      newQueue.push(...practicePool.sort(() => 0.5 - Math.random()));

      setQueue(newQueue);
   }, [level]);

   const speak = (text: string) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
   };

   const currentQ = queue[currentIndex];

   // Auto-play audio on new question
   useEffect(() => {
      if (currentQ && status === 'thinking') {
         if (currentQ.type === 'flashcard' || currentQ.type === 'spelling') {
            speak(currentQ.word.en);
         }
      }
   }, [currentIndex, status, currentQ]);

   const handleCheck = () => {
      if (!currentQ) return;

      let isCorrect = false;

      if (currentQ.type === 'flashcard') {
         isCorrect = true; // Always correct, just acknowledging
      } else if (currentQ.type === 'mcq') {
         if (selectedOption === currentQ.word.bn) isCorrect = true;
      } else if (currentQ.type === 'spelling') {
         if (textInput.trim().toLowerCase() === currentQ.word.en.toLowerCase()) isCorrect = true;
      }

      if (isCorrect) {
         setStatus('correct');
         successSound.play().catch(() => {});
      } else {
         setStatus('wrong');
         errorSound.play().catch(() => {});
         setHearts(h => Math.max(0, h - 1));
      }
   };

   const handleContinue = () => {
      if (currentIndex < queue.length - 1) {
         setCurrentIndex(prev => prev + 1);
         setProgress(((currentIndex + 1) / queue.length) * 100);
         setStatus('thinking');
         setSelectedOption(null);
         setTextInput('');
      } else {
         // Finish
         setStatus('finished');
      }
   };

   if (hearts === 0) {
      return (
         <div className="h-full flex flex-col items-center justify-center bg-[#121212] text-center p-6 animate-in zoom-in">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
               <X className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Out of hearts!</h2>
            <p className="text-gray-400 mb-8">Practice to restore your health.</p>
            <button 
               onClick={onExit}
               className="w-full py-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700"
            >
               Quit Lesson
            </button>
         </div>
      );
   }

   if (status === 'finished') {
      return (
         <div className="h-full flex flex-col items-center justify-center bg-[#121212] text-center p-6 animate-in zoom-in">
            <div className="w-32 h-32 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 relative">
               <Trophy className="w-16 h-16 text-yellow-500" />
               <div className="absolute inset-0 border-4 border-yellow-500 rounded-full animate-ping opacity-20"></div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Lesson Complete!</h2>
            <div className="flex gap-2 mb-8">
               {[1, 2, 3].map(i => (
                  <Star key={i} className={`w-8 h-8 ${i <= (hearts > 0 ? 3 : 1) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />
               ))}
            </div>
            <button 
               onClick={() => onComplete(3)}
               className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 shadow-lg shadow-green-900/30"
            >
               Continue
            </button>
         </div>
      );
   }

   if (!currentQ) return null;

   return (
      <div className="h-full flex flex-col bg-[#121212] relative overflow-hidden">
         {/* Top Bar */}
         <div className="px-4 pt-4 pb-2 flex items-center gap-4">
            <button onClick={onExit}><X className="w-6 h-6 text-gray-400" /></button>
            <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
               <div 
                  className="h-full bg-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
               ></div>
            </div>
            <div className="flex items-center gap-1 text-red-500">
               <Zap className="w-5 h-5 fill-current" />
               <span className="font-bold">{hearts}</span>
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
            
            {/* Flashcard Intro */}
            {currentQ.type === 'flashcard' && (
               <div className="text-center w-full animate-in slide-in-from-right">
                  <h3 className="text-purple-400 font-bold text-sm uppercase tracking-widest mb-6">New Word</h3>
                  
                  <div className="bg-app-card border-2 border-purple-500/30 rounded-3xl p-8 mb-8 shadow-2xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-6 -mt-6"></div>
                     
                     <button onClick={() => speak(currentQ.word.en)} className="mb-4 p-4 bg-purple-500 rounded-full text-white shadow-lg hover:scale-110 transition-transform">
                        <Volume2 className="w-8 h-8" />
                     </button>
                     
                     <h1 className="text-4xl font-bold text-white mb-2">{currentQ.word.en}</h1>
                     <p className="text-gray-500 font-mono mb-6">{currentQ.word.pronunciation}</p>
                     
                     <div className="h-px w-16 bg-white/10 mx-auto mb-6"></div>
                     
                     <h2 className="text-2xl font-bold text-green-400">{currentQ.word.bn}</h2>
                  </div>
               </div>
            )}

            {/* MCQ */}
            {currentQ.type === 'mcq' && (
               <div className="w-full animate-in slide-in-from-right">
                  <h2 className="text-xl font-bold text-white mb-8">Select the correct meaning</h2>
                  
                  <div className="flex items-center gap-4 mb-8 p-4 bg-white/5 rounded-xl border border-white/5">
                     <button onClick={() => speak(currentQ.word.en)} className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                        <Volume2 className="w-6 h-6" />
                     </button>
                     <span className="text-2xl font-bold text-white">{currentQ.word.en}</span>
                  </div>

                  <div className="space-y-3">
                     {currentQ.options?.map((opt, i) => (
                        <button
                           key={i}
                           disabled={status !== 'thinking'}
                           onClick={() => setSelectedOption(opt)}
                           className={`w-full p-4 rounded-xl border-2 text-left font-medium text-lg transition-all ${
                              selectedOption === opt 
                                 ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                                 : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                           }`}
                        >
                           <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-md border flex items-center justify-center text-xs ${selectedOption === opt ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-600 text-gray-500'}`}>
                                 {String.fromCharCode(65 + i)}
                              </div>
                              {opt}
                           </div>
                        </button>
                     ))}
                  </div>
               </div>
            )}

            {/* Spelling */}
            {currentQ.type === 'spelling' && (
               <div className="w-full text-center animate-in slide-in-from-right">
                  <h2 className="text-xl font-bold text-white mb-8">Type what you hear</h2>
                  
                  <button 
                     onClick={() => speak(currentQ.word.en)}
                     className="w-32 h-32 bg-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-purple-900/30 hover:scale-105 transition-transform active:scale-95"
                  >
                     <Volume2 className="w-12 h-12 text-white" />
                  </button>

                  <input 
                     type="text"
                     value={textInput}
                     onChange={(e) => setTextInput(e.target.value)}
                     disabled={status !== 'thinking'}
                     placeholder="Type in English..."
                     className="w-full bg-gray-800 border-b-4 border-gray-700 rounded-xl p-4 text-center text-xl text-white focus:outline-none focus:border-purple-500 focus:bg-gray-700 transition-colors"
                  />
                  
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                     <BookOpen className="w-4 h-4" />
                     <span>Hint: {currentQ.word.bn}</span>
                  </div>
               </div>
            )}

         </div>

         {/* Bottom Footer (Action Area) */}
         <div className={`p-4 pb-8 border-t ${
            status === 'correct' ? 'bg-green-900/20 border-green-500/30' : 
            status === 'wrong' ? 'bg-red-900/20 border-red-500/30' : 
            'bg-[#121212] border-white/10'
         }`}>
            <div className="max-w-md mx-auto w-full">
               {/* Feedback Message */}
               {status === 'correct' && (
                  <div className="flex items-center gap-3 mb-4 animate-in slide-in-from-bottom-2">
                     <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-6 h-6 text-black stroke-[3px]" />
                     </div>
                     <div>
                        <h3 className="text-green-500 font-bold text-lg">Excellent!</h3>
                     </div>
                  </div>
               )}

               {status === 'wrong' && (
                  <div className="flex items-center gap-3 mb-4 animate-in slide-in-from-bottom-2">
                     <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                        <X className="w-6 h-6 text-white stroke-[3px]" />
                     </div>
                     <div>
                        <h3 className="text-red-500 font-bold text-lg">Incorrect</h3>
                        <p className="text-red-400 text-sm">Correct Answer: <span className="font-bold">{currentQ.type === 'mcq' ? currentQ.word.bn : currentQ.word.en}</span></p>
                     </div>
                  </div>
               )}

               {/* Main Button */}
               <button 
                  onClick={status === 'thinking' ? handleCheck : handleContinue}
                  disabled={status === 'thinking' && currentQ.type !== 'flashcard' && !selectedOption && !textInput}
                  className={`w-full py-3.5 rounded-2xl font-bold text-lg shadow-lg transition-all active:translate-y-[2px] active:shadow-none ${
                     status === 'thinking'
                        ? 'bg-green-600 text-white shadow-green-900/50 hover:bg-green-500 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed'
                        : status === 'correct'
                           ? 'bg-green-500 text-black shadow-green-600/50 hover:bg-green-400'
                           : 'bg-red-500 text-white shadow-red-900/50 hover:bg-red-400'
                  }`}
               >
                  {status === 'thinking' ? 'Check Answer' : 'Continue'}
               </button>
            </div>
         </div>

      </div>
   );
};

export default Vocabulary;
