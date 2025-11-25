import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { ArrowLeft, PieChart, ChevronDown, ChevronUp, CheckCircle, XCircle, Trophy } from 'lucide-react';
import { Subject, Chapter } from '../types';

interface ProgressReportProps {
  user: User;
  userClass: string;
  onBack: () => void;
}

interface ChapterStats {
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
}

interface SubjectStats extends ChapterStats {
  chapters: Record<string, ChapterStats>;
}

const ProgressReport: React.FC<ProgressReportProps> = ({ user, userClass, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chaptersMap, setChaptersMap] = useState<Record<string, Chapter[]>>({});
  const [stats, setStats] = useState<Record<string, SubjectStats>>({});
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // Overall Stats
  const [overallStats, setOverallStats] = useState({
    totalAttempts: 0,
    totalCorrect: 0,
    totalQuestionsAvailable: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Subjects for User Class
        const subjectsQ = query(collection(db, 'subjects'), where('classLevel', '==', userClass));
        const subjectsSnap = await getDocs(subjectsQ);
        const subjectsData = subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Subject[];
        setSubjects(subjectsData);

        // 2. Fetch Chapters and Questions for these subjects
        const chapMap: Record<string, Chapter[]> = {};
        const statsMap: Record<string, SubjectStats> = {};
        let totalQsAvailable = 0;

        // Initialize stats map
        subjectsData.forEach(sub => {
          statsMap[sub.id] = {
            totalQuestions: 0,
            attempted: 0,
            correct: 0,
            incorrect: 0,
            chapters: {}
          };
        });

        // We need to fetch chapters and questions. 
        // For optimization in a real app, we'd use aggregation or stored counters.
        // Here we will fetch chapters first.
        for (const sub of subjectsData) {
          const chapQ = query(collection(db, 'chapters'), where('subjectId', '==', sub.id));
          const chapSnap = await getDocs(chapQ);
          const chaps = chapSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Chapter[];
          chapMap[sub.id] = chaps;

          // Initialize chapter stats
          chaps.forEach(ch => {
            statsMap[sub.id].chapters[ch.id] = {
              totalQuestions: 0,
              attempted: 0,
              correct: 0,
              incorrect: 0
            };
          });
        }
        setChaptersMap(chapMap);

        // 3. Fetch ALL questions to count totals per chapter (Heavy read, but needed for "total %")
        // In production, store 'questionCount' on Chapter document.
        const questionsSnap = await getDocs(collection(db, 'questions'));
        questionsSnap.docs.forEach(doc => {
          const qData = doc.data();
          const chapterId = qData.chapterId;
          
          // Find which subject this chapter belongs to
          for (const subId in chapMap) {
             const ch = chapMap[subId].find(c => c.id === chapterId);
             if (ch) {
               // Increment totals
               statsMap[subId].totalQuestions++;
               statsMap[subId].chapters[chapterId].totalQuestions++;
               totalQsAvailable++;
               break;
             }
          }
        });

        // 4. Fetch User Attempts
        const attemptsRef = collection(db, 'users', user.uid, 'attempts');
        const attemptsSnap = await getDocs(attemptsRef);
        
        let grandTotalAttempts = 0;
        let grandTotalCorrect = 0;

        attemptsSnap.docs.forEach(doc => {
          const data = doc.data();
          const { subjectId, chapterId, isCorrect } = data;

          if (statsMap[subjectId]) {
            // Update Subject Stats
            statsMap[subjectId].attempted++;
            if (isCorrect) statsMap[subjectId].correct++;
            else statsMap[subjectId].incorrect++;

            // Update Chapter Stats
            if (statsMap[subjectId].chapters[chapterId]) {
               statsMap[subjectId].chapters[chapterId].attempted++;
               if (isCorrect) statsMap[subjectId].chapters[chapterId].correct++;
               else statsMap[subjectId].chapters[chapterId].incorrect++;
            }

            grandTotalAttempts++;
            if (isCorrect) grandTotalCorrect++;
          }
        });

        setStats(statsMap);
        setOverallStats({
          totalAttempts: grandTotalAttempts,
          totalCorrect: grandTotalCorrect,
          totalQuestionsAvailable: totalQsAvailable
        });

      } catch (error) {
        console.error("Error fetching progress:", (error as any).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userClass, user.uid]);

  const toggleExpand = (subjectId: string) => {
    setExpandedSubject(expandedSubject === subjectId ? null : subjectId);
  };

  if (loading) {
    return (
      <div className="pb-24 animate-pulse">
         <div className="flex items-center gap-3 mb-6 mt-2">
           <div className="w-8 h-8 bg-white/10 rounded-full"></div>
           <div className="h-6 w-40 bg-white/10 rounded"></div>
         </div>

         <div className="bg-white/5 rounded-2xl p-6 border border-white/5 mb-8 h-32"></div>

         <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-app-card rounded-xl border border-white/5 h-20"></div>
            ))}
         </div>
      </div>
    );
  }

  const overallPercentage = overallStats.totalAttempts > 0 
    ? Math.round((overallStats.totalCorrect / overallStats.totalAttempts) * 100) 
    : 0;

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
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-5 h-5 text-green-500" />
            প্রোগ্রেস রিপোর্ট
          </h2>
          <p className="text-gray-400 text-xs">আপনার অনুশীলনের বিস্তারিত</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-green-900/40 to-black rounded-2xl p-6 border border-green-500/20 mb-8 shadow-lg">
        <div className="flex items-center justify-between">
           <div>
             <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1">Overall Accuracy</p>
             <h3 className="text-4xl font-bold text-white">{overallPercentage}%</h3>
             <p className="text-gray-400 text-xs mt-2">
               Total Solved: <span className="text-white font-bold">{overallStats.totalAttempts}</span> / {overallStats.totalQuestionsAvailable}
             </p>
           </div>
           <div className="w-16 h-16 rounded-full border-4 border-green-500/30 flex items-center justify-center bg-green-500/10">
              <Trophy className="w-8 h-8 text-green-500" />
           </div>
        </div>
      </div>

      {/* Subject List */}
      <div className="space-y-4">
        {subjects.map(subject => {
          const subStats = stats[subject.id] || { attempted: 0, correct: 0, incorrect: 0, totalQuestions: 0, chapters: {} };
          const progress = subStats.totalQuestions > 0 
            ? Math.round((subStats.attempted / subStats.totalQuestions) * 100) 
            : 0;
          const isExpanded = expandedSubject === subject.id;
          const chaps = chaptersMap[subject.id] || [];

          return (
            <div key={subject.id} className="bg-app-card rounded-xl border border-white/5 overflow-hidden">
              <div 
                onClick={() => toggleExpand(subject.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-white">{subject.title}</h3>
                    <span className="text-xs text-gray-400 font-mono">{progress}% Complete</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>

                  <div className="flex gap-4 text-xs">
                     <span className="text-green-400 flex items-center gap-1">
                       <CheckCircle className="w-3 h-3" /> {subStats.correct} Correct
                     </span>
                     <span className="text-red-400 flex items-center gap-1">
                       <XCircle className="w-3 h-3" /> {subStats.incorrect} Incorrect
                     </span>
                  </div>
                </div>
                
                <div className="ml-4 text-gray-500">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {/* Expanded Chapters */}
              {isExpanded && (
                <div className="bg-black/20 border-t border-white/5 p-3 space-y-2 animate-in slide-in-from-top-2">
                   {chaps.length === 0 ? (
                     <p className="text-center text-gray-500 text-xs py-2">No chapters available.</p>
                   ) : (
                     chaps.map(chap => {
                        const cStats = subStats.chapters[chap.id] || { attempted: 0, correct: 0, incorrect: 0, totalQuestions: 0 };
                        const cProgress = cStats.totalQuestions > 0 
                          ? Math.round((cStats.attempted / cStats.totalQuestions) * 100)
                          : 0;
                        
                        return (
                          <div key={chap.id} className="p-3 rounded-lg bg-white/5 border border-white/5">
                             <div className="flex justify-between items-start mb-2">
                               <h4 className="text-sm text-gray-200">{chap.title}</h4>
                               <span className="text-[10px] text-gray-500 bg-white/10 px-1.5 py-0.5 rounded">
                                 {cStats.attempted}/{cStats.totalQuestions}
                               </span>
                             </div>
                             
                             <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
                                <div className="h-full bg-blue-500" style={{ width: `${cProgress}%` }}></div>
                             </div>

                             <div className="flex gap-3 text-[10px]">
                                <span className="text-gray-400">Correct: <span className="text-green-400">{cStats.correct}</span></span>
                                <span className="text-gray-400">Incorrect: <span className="text-red-400">{cStats.incorrect}</span></span>
                             </div>
                          </div>
                        );
                     })
                   )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressReport;