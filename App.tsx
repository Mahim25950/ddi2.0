
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { auth } from './firebase';
import Header from './components/Header';
import MenuCard from './components/MenuCard';
import ResumeSection from './components/ResumeSection';
import BottomNav from './components/BottomNav';
import SubjectSelection from './components/SubjectSelection';
import ChapterSelection from './components/ChapterSelection';
import TopicSelection from './components/TopicSelection';
import MCQPractice from './components/MCQPractice';
import FormulaList from './components/FormulaList';
import LessonView from './components/LessonView';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import ProfileSection from './components/ProfileSection';
import ProgressReport from './components/ProgressReport';
import Leaderboard from './components/Leaderboard';
import Vocabulary from './components/Vocabulary';
import { GRID_ITEMS } from './constants';
import { Subject, Chapter, Topic } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'home' | 'practice' | 'chapters' | 'topics' | 'lesson-view' | 'mcq-practice' | 'formula-list' | 'admin' | 'profile' | 'progress' | 'leaderboard' | 'vocabulary'>('home');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isQuickRevision, setIsQuickRevision] = useState(false);
  const [isFormulaMode, setIsFormulaMode] = useState(false);
  const [isLessonMode, setIsLessonMode] = useState(false);
  
  // User Class State (Persisted in LocalStorage)
  const [userClass, setUserClass] = useState<string>(() => {
    return localStorage.getItem('userClass') || 'Class 8';
  });

  const handleClassChange = (newClass: string) => {
    setUserClass(newClass);
    localStorage.setItem('userClass', newClass);
  };

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setCurrentView('home');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleMenuClick = (id: string) => {
    setIsQuickRevision(false);
    setIsFormulaMode(false);
    setIsLessonMode(false);

    if (id === 'practice') {
      setCurrentView('practice');
    } else if (id === 'lesson') {
      setIsLessonMode(true);
      setCurrentView('practice');
    } else if (id === 'quick-revision' || id === 'quick-revision-2') {
      setIsQuickRevision(true);
      setCurrentView('practice');
    } else if (id === 'formula') {
      setIsFormulaMode(true);
      setCurrentView('practice');
    } else if (id === 'vocabulary') {
      setCurrentView('vocabulary');
    }
    // Handle other IDs here if needed
  };

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentView('chapters');
  };

  const handleChapterSelect = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    if (isFormulaMode) {
      setCurrentView('formula-list');
    } else if (isLessonMode) {
      setCurrentView('topics');
    } else {
      setSelectedTopic(null);
      setCurrentView('mcq-practice');
    }
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    if (isLessonMode) {
      setCurrentView('lesson-view');
    } else {
      setCurrentView('mcq-practice');
    }
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setIsQuickRevision(false);
    setIsFormulaMode(false);
    setIsLessonMode(false);
    setSelectedTopic(null);
  };

  const handleNavClick = (id: string) => {
    if (id === 'home') {
      handleBackToHome();
    } else if (id === 'progress') {
      setCurrentView('progress');
    } else if (id === 'leaderboard') {
      setCurrentView('leaderboard');
    }
    // Future nav items can be handled here
  };

  // Show loading spinner with branding while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center gap-6">
        <div className="relative w-20 h-20 flex items-center justify-center bg-gradient-to-tr from-green-600 to-emerald-400 rounded-2xl shadow-lg shadow-green-900/20 animate-pulse">
             <span className="text-white font-bold text-4xl">d</span>
        </div>
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  // Show Auth Screen if no user is logged in
  if (!user) {
    return <AuthScreen />;
  }

  return (
    // Center container to simulate mobile view on desktop, match background color
    <div className="min-h-screen bg-app-bg text-white flex justify-center">
      <div className="w-full max-w-md relative bg-app-bg shadow-2xl">
        <Header 
          user={user} 
          onAdminClick={() => setCurrentView('admin')} 
          onProfileClick={() => setCurrentView('profile')}
        />
        
        <main className="px-4 pt-2 pb-4 min-h-[calc(100vh-140px)]">
          {currentView === 'home' && (
            <div className="animate-in fade-in duration-300">
              {/* Welcome / Class Info */}
              <div className="mb-4 px-1">
                 <p className="text-gray-400 text-xs">Currently studying in</p>
                 <h2 className="text-xl font-bold text-green-500">{userClass}</h2>
              </div>

              {/* Grid Menu */}
              <div className="grid grid-cols-3 gap-3">
                {GRID_ITEMS.map((item, index) => (
                  <MenuCard 
                    key={`${item.id}-${index}`} 
                    item={item} 
                    onClick={() => handleMenuClick(item.id)}
                  />
                ))}
              </div>

              {/* Resume Activity Section */}
              <ResumeSection />
            </div>
          )}

          {currentView === 'practice' && (
            <SubjectSelection 
              onBack={handleBackToHome} 
              onSelectSubject={handleSubjectSelect}
              userClass={userClass}
              isQuickRevision={isQuickRevision}
              isFormulaMode={isFormulaMode}
              isLessonMode={isLessonMode}
            />
          )}

          {currentView === 'chapters' && selectedSubject && (
            <ChapterSelection 
              subject={selectedSubject}
              onBack={() => setCurrentView('practice')}
              onSelectChapter={handleChapterSelect}
              isQuickRevision={isQuickRevision}
              isFormulaMode={isFormulaMode}
              isLessonMode={isLessonMode}
            />
          )}

          {currentView === 'topics' && selectedChapter && (
            <TopicSelection
              chapter={selectedChapter}
              onBack={() => setCurrentView('chapters')}
              onSelectTopic={handleTopicSelect}
            />
          )}

          {currentView === 'lesson-view' && selectedTopic && (
            <LessonView 
              topic={selectedTopic}
              user={user}
              onBack={() => setCurrentView('topics')}
              onStartPractice={() => setCurrentView('mcq-practice')}
            />
          )}

          {currentView === 'mcq-practice' && selectedChapter && (
             <MCQPractice 
               chapter={selectedChapter}
               onBack={() => isLessonMode ? setCurrentView('lesson-view') : setCurrentView('chapters')}
               user={user}
               isQuickRevision={isQuickRevision}
               preselectedTopic={selectedTopic}
             />
          )}

          {currentView === 'formula-list' && selectedChapter && (
            <FormulaList 
              chapter={selectedChapter}
              onBack={() => setCurrentView('chapters')}
            />
          )}

          {currentView === 'progress' && (
            <ProgressReport 
              user={user}
              userClass={userClass}
              onBack={handleBackToHome}
            />
          )}

          {currentView === 'leaderboard' && (
            <Leaderboard 
              currentUser={user}
              onBack={handleBackToHome}
            />
          )}

          {currentView === 'vocabulary' && (
            <Vocabulary onBack={handleBackToHome} />
          )}

          {currentView === 'admin' && (
            <AdminPanel onBack={handleBackToHome} />
          )}

          {currentView === 'profile' && user && (
            <ProfileSection 
              user={user}
              onBack={handleBackToHome}
              userClass={userClass}
              onClassChange={handleClassChange}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        {currentView !== 'mcq-practice' && currentView !== 'formula-list' && currentView !== 'lesson-view' && (
          <BottomNav 
            onNavClick={handleNavClick} 
            currentView={currentView} 
          />
        )}
      </div>
    </div>
  );
};

export default App;
