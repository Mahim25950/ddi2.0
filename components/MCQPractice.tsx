
import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, RotateCcw, Bookmark, Tag, SlidersHorizontal, Settings2, X, Clock, ChevronDown, ChevronUp, Eye, Type, List } from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, increment } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { Chapter, Question, Topic } from '../types';

interface MCQPracticeProps {
  chapter: Chapter;
  onBack: () => void;
  user: User;
  isQuickRevision?: boolean;
  preselectedTopic?: Topic | null;
}

interface UserAnswerResult {
  questionId: string;
  question: string;
  options?: string[];
  correctAnswer: any;
  selectedOption?: any;
  isCorrect: boolean;
  explanation?: string;
  type?: string;
}

const MCQPractice: React.FC<MCQPracticeProps> = ({ chapter, onBack, user, isQuickRevision = false, preselectedTopic = null }) => {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  // Filter State
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(preselectedTopic ? preselectedTopic.id : null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const [tempTopicId, setTempTopicId] = useState<string | null>(preselectedTopic ? preselectedTopic.id : null);
  const [tempCount, setTempCount] = useState<number>(20);

  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Interaction States
  const [selectedOption, setSelectedOption] = useState<number | null>(null); // For MCQ
  const [gapInputs, setGapInputs] = useState<string[]>([]); // For Gap Fills
  const [textInput, setTextInput] = useState(''); // For Rewrite
  
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const [elapsedTime, setElapsedTime] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswerResult[]>([]);
  const [showReview, setShowReview] = useState(false);
  
  const [toast, setToast] = useState<{ show: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'questions'),
          where('chapterId', '==', chapter.id)
        );
        const questionSnapshot = await getDocs(q);
        let fetchedQuestions = questionSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Question[];

        if (!isQuickRevision) {
           const topicQ = query(collection(db, 'topics'), where('chapterId', '==', chapter.id));
           const topicSnap = await getDocs(topicQ);
           const fetchedTopics = topicSnap.docs.map(doc => ({
             id: doc.id,
             ...doc.data()
           })) as Topic[];
           setTopics(fetchedTopics);
        }

        const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
        const bookmarksSnapshot = await getDocs(bookmarksRef);
        const userBookmarks = new Set(bookmarksSnapshot.docs.map(doc => doc.id));
        setBookmarkedIds(userBookmarks);

        if (isQuickRevision) {
          fetchedQuestions = fetchedQuestions.filter(q => q.id && userBookmarks.has(q.id));
        }

        setAllQuestions(fetchedQuestions);

        if (preselectedTopic) {
           const topicFiltered = fetchedQuestions.filter(q => q.topicId === preselectedTopic.id);
           setQuestions(topicFiltered);
        } else {
           setQuestions(fetchedQuestions);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chapter.id, user.uid, isQuickRevision, preselectedTopic]);

  useEffect(() => {
    let timer: any;
    if (!loading && !showScore && questions.length > 0) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [loading, showScore, questions.length]);

  useEffect(() => {
    if (!loading && (window as any).MathJax) {
      setTimeout(() => {
        (window as any).MathJax.typesetPromise && (window as any).MathJax.typesetPromise();
      }, 100);
    }
  }, [currentQuestionIndex, loading, isAnswerChecked, questions, showReview]);

  useEffect(() => {
    if (toast?.show) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Reset inputs when moving to next question
  useEffect(() => {
     setSelectedOption(null);
     setGapInputs([]);
     setTextInput('');
  }, [currentQuestionIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getMaxAvailable = (tId: string | null) => {
    if (!tId) return allQuestions.length;
    return allQuestions.filter(q => q.topicId === tId).length;
  };

  const handleOpenFilter = () => {
    setTempTopicId(selectedTopicId);
    const available = getMaxAvailable(selectedTopicId);
    setTempCount(questions.length > 0 ? Math.min(questions.length, available) : available);
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    let filtered = [...allQuestions];
    if (tempTopicId) filtered = filtered.filter(q => q.topicId === tempTopicId);
    filtered = filtered.sort(() => Math.random() - 0.5);
    const max = filtered.length;
    const finalLimit = Math.max(1, Math.min(tempCount, max));
    if (finalLimit < max) filtered = filtered.slice(0, finalLimit);

    setQuestions(filtered);
    setSelectedTopicId(tempTopicId);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setScore(0);
    setShowScore(false);
    setElapsedTime(0);
    setUserAnswers([]);
    setShowReview(false);
    setShowFilterModal(false);
    setToast({ show: true, message: 'Settings Applied & Restarted!' });
  };

  const handleOptionClick = (index: number) => {
    if (isAnswerChecked) return;
    setSelectedOption(index);
  };

  const playFeedbackSound = (isCorrect: boolean) => {
    if (localStorage.getItem('app_sound') === 'false') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isCorrect) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e: any) { console.error(e.message); }
  };

  // --- Logic for parsing questions ---

  // Extracts parts and answers for Gap Fills: "The sky is {{blue}}" -> parts ["The sky is ", "blue", ""]
  const parseGapQuestion = (text: string) => {
     const parts = text.split(/\{\{(.*?)\}\}/g);
     // parts[0] = text before, parts[1] = answer, parts[2] = text after...
     return parts;
  };

  const getGapAnswers = (text: string) => {
     const matches = text.match(/\{\{(.*?)\}\}/g);
     if (!matches) return [];
     return matches.map(m => m.replace(/\{\{|\}\}/g, '').trim());
  };

  const handleCheckAnswer = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const type = currentQuestion.type || 'mcq';
    let isCorrect = false;
    let userVal: any = null;

    if (type === 'mcq' || type === 'classification') {
       if (selectedOption === null) return;
       userVal = selectedOption;
       // DB correct answer is 1-based index
       isCorrect = (selectedOption + 1) === Number(currentQuestion.correctAnswer);
    } else if (type.includes('gap')) {
       const correctAnswers = getGapAnswers(currentQuestion.question);
       const inputs = [...gapInputs]; // User inputs
       // Check if all inputs match correct answers
       isCorrect = correctAnswers.length === inputs.length && correctAnswers.every((ans, i) => 
          (inputs[i] || '').trim().toLowerCase() === ans.toLowerCase()
       );
       userVal = inputs;
    } else if (type === 'rewrite') {
       const correct = String(currentQuestion.correctAnswer).trim();
       // Simple normalization: lower case, remove punctuation
       const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;]/g, '').trim();
       isCorrect = normalize(textInput) === normalize(correct);
       userVal = textInput;
    }
    
    playFeedbackSound(isCorrect);
    if (isCorrect) setScore(prev => prev + 1);
    setIsAnswerChecked(true);

    const answerRecord: UserAnswerResult = {
      questionId: currentQuestion.id || 'unknown',
      question: currentQuestion.question,
      options: currentQuestion.options,
      correctAnswer: currentQuestion.correctAnswer,
      selectedOption: userVal,
      isCorrect: isCorrect,
      explanation: currentQuestion.explanation,
      type: type
    };
    setUserAnswers(prev => [...prev, answerRecord]);

    if (currentQuestion.id && !isQuickRevision) {
       try {
         const attemptRef = doc(db, 'users', user.uid, 'attempts', currentQuestion.id);
         await setDoc(attemptRef, {
           questionId: currentQuestion.id,
           chapterId: chapter.id,
           subjectId: chapter.subjectId,
           isCorrect: isCorrect,
           timestamp: Date.now()
         });
         if (isCorrect) {
           await setDoc(doc(db, 'users', user.uid), {
             totalScore: increment(1),
             displayName: user.displayName,
             photoURL: user.photoURL,
             lastActive: Date.now()
           }, { merge: true });
         }
       } catch (err: any) { console.error("Save error:", err.message); }
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsAnswerChecked(false);
    } else {
      setShowScore(true);
    }
  };

  const handleRestart = () => { handleApplyFilter(); };

  const toggleBookmark = async (question: Question) => {
    if (!question.id) return;
    const qId = question.id;
    const isBookmarked = bookmarkedIds.has(qId);
    setBookmarkedIds(prev => {
      const newSet = new Set(prev);
      if (isBookmarked) newSet.delete(qId);
      else newSet.add(qId);
      return newSet;
    });
    setToast({ show: true, message: isBookmarked ? 'Removed Bookmark' : 'Bookmarked' });
    try {
      const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', qId);
      if (isBookmarked) await deleteDoc(bookmarkRef);
      else await setDoc(bookmarkRef, { questionId: qId, chapterId: chapter.id, subjectId: chapter.subjectId, timestamp: Date.now() });
    } catch (error) { console.error("Error toggling bookmark"); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Practice...</div>;
  
  if (allQuestions.length === 0) return <div className="p-8 text-center text-gray-400">No questions found.</div>;

  if (showScore) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="animate-in fade-in zoom-in duration-300 pb-24 h-full overflow-y-auto scrollbar-hide">
        <div className="bg-app-card rounded-3xl p-8 border border-white/10 flex flex-col items-center text-center mt-4 shadow-2xl mx-4">
          <h2 className="text-2xl font-bold text-white mb-2">{isQuickRevision ? 'Revision Done!' : 'Practice Complete!'}</h2>
          <div className="w-32 h-32 rounded-full border-4 border-green-500 flex flex-col items-center justify-center mb-6 relative bg-green-500/5">
            <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">Score</span>
            <div className="text-3xl font-bold text-white leading-none">{score}/{questions.length}</div>
          </div>
          <div className="flex gap-3 w-full mb-4">
            <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors text-sm">Back</button>
            <button onClick={handleRestart} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-500 transition-colors flex items-center justify-center gap-2 text-sm"><RotateCcw className="w-4 h-4" /> Restart</button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const qType = currentQuestion.type || 'mcq';
  const isBookmarked = currentQuestion?.id ? bookmarkedIds.has(currentQuestion.id) : false;
  
  // Prepare clues for "Gap with Clues"
  let clues: string[] = [];
  if (qType === 'gap_with_clues') {
     clues = getGapAnswers(currentQuestion.question).sort(() => Math.random() - 0.5);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] pb-4 relative">
      {toast?.show && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-gray-800/95 text-white px-4 py-2 rounded-full text-xs font-medium z-50 flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-green-500" /> {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2"><ArrowLeft className="w-6 h-6 text-gray-400 hover:text-white" /></button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-gray-300 bg-white/5 px-3 py-1 rounded-full mb-1 border border-white/5">
             <Clock className="w-3 h-3 text-green-400" />
             <span className="text-xs font-mono font-medium tabular-nums">{formatTime(elapsedTime)}</span>
          </div>
          <p className="text-gray-500 text-[10px] font-medium">Question <span className="text-white">{currentQuestionIndex + 1}</span> / {questions.length}</p>
        </div>
        <button onClick={handleOpenFilter} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white -mr-2"><SlidersHorizontal className="w-6 h-6" /></button>
      </div>
      
      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-app-card w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-white">Settings</h3>
                 <button onClick={() => setShowFilterModal(false)}><X className="w-6 h-6 text-gray-500" /></button>
              </div>
              <button onClick={handleApplyFilter} className="w-full py-4 rounded-xl bg-green-600 text-white font-bold hover:bg-green-500">Apply & Restart</button>
           </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
         {/* Question Area */}
         <div className="bg-app-card rounded-2xl p-6 border border-white/5 mb-4 shadow-lg relative group">
            <button onClick={() => toggleBookmark(currentQuestion)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-yellow-400 transition-colors z-10"><Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-yellow-400 text-yellow-400' : ''}`} /></button>
            
            {/* Render Question Text based on Type */}
            {(qType === 'mcq' || qType === 'classification' || qType === 'rewrite') && (
               <h3 className="text-lg font-medium text-white leading-relaxed pr-8">{currentQuestion.question}</h3>
            )}
            
            {(qType.includes('gap')) && (
               <div className="text-lg font-medium text-white leading-loose pr-8">
                  {/* Clues Box */}
                  {qType === 'gap_with_clues' && (
                     <div className="mb-4 p-3 bg-white/5 rounded-xl flex flex-wrap gap-2 border border-white/10">
                        {clues.map((clue, i) => (
                           <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-sm font-mono border border-blue-500/30">{clue}</span>
                        ))}
                     </div>
                  )}
                  {/* Render Parsed Gap Sentence */}
                  {parseGapQuestion(currentQuestion.question).map((part, i) => {
                     // Even indices are text, odd are gaps
                     if (i % 2 === 0) return <span key={i}>{part}</span>;
                     const gapIndex = Math.floor(i / 2);
                     const answer = part; // The text inside {{}}
                     const isCorrect = isAnswerChecked && (gapInputs[gapIndex] || '').toLowerCase() === answer.toLowerCase();
                     const isWrong = isAnswerChecked && !isCorrect;
                     
                     return (
                        <span key={i} className="inline-block mx-1 relative">
                           <input 
                              type="text" 
                              value={gapInputs[gapIndex] || ''}
                              onChange={(e) => {
                                 const newInputs = [...gapInputs];
                                 newInputs[gapIndex] = e.target.value;
                                 setGapInputs(newInputs);
                              }}
                              disabled={isAnswerChecked}
                              className={`w-24 bg-black/30 border-b-2 px-2 py-0.5 text-center text-green-400 focus:outline-none transition-colors ${
                                 isCorrect ? 'border-green-500 bg-green-500/10' : 
                                 isWrong ? 'border-red-500 bg-red-500/10 text-red-400' : 
                                 'border-gray-600 focus:border-blue-500'
                              }`} 
                           />
                           {isWrong && <span className="absolute -top-4 left-0 text-[10px] text-green-400 bg-black/80 px-1 rounded">{answer}</span>}
                        </span>
                     );
                  })}
               </div>
            )}
            
            {currentQuestion.topicId && (
               <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-[10px] text-gray-500 border border-white/5">
                  <Tag className="w-3 h-3" />
                  {topics.find(t => t.id === currentQuestion.topicId)?.title || 'Topic'}
               </div>
            )}
         </div>

         {/* Render Options / Input Areas */}
         
         {/* MCQ Options */}
         {(qType === 'mcq' || qType === 'classification') && currentQuestion.options && (
            <div className="space-y-3">
               {currentQuestion.options.map((option, index) => {
                 let style = "border-white/10 hover:bg-white/5 bg-app-card";
                 if (isAnswerChecked) {
                    const correctIndex = Number(currentQuestion.correctAnswer) - 1;
                    if (index === correctIndex) style = "border-green-500 bg-green-500/10";
                    else if (index === selectedOption) style = "border-red-500 bg-red-500/10";
                    else style = "border-white/5 opacity-40";
                 } else if (selectedOption === index) {
                    style = "border-blue-500 bg-blue-500/10";
                 }

                 return (
                   <button key={index} onClick={() => handleOptionClick(index)} disabled={isAnswerChecked} className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${style}`}>
                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${selectedOption === index ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-600 text-gray-500'}`}>{String.fromCharCode(65 + index)}</div>
                     <span className={`flex-1 text-sm font-medium ${isAnswerChecked && (index + 1) === Number(currentQuestion.correctAnswer) ? 'text-green-400' : 'text-gray-200'}`}>{option}</span>
                   </button>
                 );
               })}
            </div>
         )}

         {/* Rewrite Text Area */}
         {qType === 'rewrite' && (
            <div className="space-y-4">
               <textarea 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={isAnswerChecked}
                  placeholder="Type your answer here..."
                  className={`w-full bg-app-card border rounded-xl p-4 text-white focus:outline-none min-h-[100px] ${
                     isAnswerChecked 
                        ? (textInput.toLowerCase().replace(/\W/g,'') === String(currentQuestion.correctAnswer).toLowerCase().replace(/\W/g,'') ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10')
                        : 'border-white/10 focus:border-blue-500'
                  }`}
               />
               {isAnswerChecked && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                     <p className="text-xs text-green-400 font-bold uppercase mb-1">Correct Answer</p>
                     <p className="text-white">{currentQuestion.correctAnswer}</p>
                  </div>
               )}
            </div>
         )}

         {/* Explanation */}
         {isAnswerChecked && currentQuestion.explanation && (
            <div className="mt-6 p-4 bg-blue-500/5 border-l-4 border-blue-500 rounded-r-xl">
               <h4 className="text-blue-400 text-xs font-bold mb-2 uppercase flex items-center gap-2"><AlertCircle className="w-3 h-3" /> Explanation</h4>
               <p className="text-gray-300 text-sm leading-relaxed">{currentQuestion.explanation}</p>
            </div>
         )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-4 right-4 max-w-md mx-auto z-20">
        {!isAnswerChecked ? (
          <button onClick={handleCheckAnswer} disabled={qType === 'mcq' ? selectedOption === null : false} className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-gray-200 transition-all shadow-lg shadow-white/10 disabled:opacity-50">Check Answer</button>
        ) : (
          <button onClick={handleNext} className="w-full py-4 rounded-xl bg-green-600 text-white font-bold text-lg hover:bg-green-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/30">
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'} <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MCQPractice;
