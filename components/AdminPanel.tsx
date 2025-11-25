
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Plus, Upload, Trash2, CheckCircle, AlertCircle, 
  GraduationCap, Loader2, Pencil, X, 
  RefreshCw, Tag, BookA, Layers, Code, Database, FileJson, 
  ChevronRight, BookOpen, FileText, Bold, Italic, Heading1, Heading2, List, Quote, SplitSquareHorizontal,
  HelpCircle, Shuffle
} from 'lucide-react';
import { collection, addDoc, getDocs, writeBatch, doc, query, where, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Subject, Chapter, Formula, Topic, VocabularyWord, QuestionType, Question } from '../types';

interface AdminPanelProps {
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'content' | 'vocab' | 'manage'>('structure');
  const [subTab, setSubTab] = useState<string>('subject'); // For internal sub-tabs
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Admin selected class context
  const [adminSelectedClass, setAdminSelectedClass] = useState('Class 8');
  const classes = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  // Data States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  // Formula Management State
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);
  
  // Vocabulary State
  const [vocabList, setVocabList] = useState<VocabularyWord[]>([]);
  const [vocabMode, setVocabMode] = useState<'single' | 'bulk'>('single');
  
  // Manage Questions State
  const [manageQuestions, setManageQuestions] = useState<Question[]>([]);
  
  // Form States
  const [subjectTitle, setSubjectTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  const [chapterTitle, setChapterTitle] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  const [topicTitle, setTopicTitle] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState(''); // For MCQ upload filtering
  
  const [jsonInput, setJsonInput] = useState('');

  // Question Builder State
  const [qType, setQType] = useState<QuestionType>('mcq');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState<number>(0); // Index for MCQ
  const [qRewriteAnswer, setQRewriteAnswer] = useState(''); // Text for rewrite
  const [qExplanation, setQExplanation] = useState('');

  // Formula Form States
  const [formulaTitle, setFormulaTitle] = useState('');
  const [formulaContent, setFormulaContent] = useState('');
  const [latexError, setLatexError] = useState<string | null>(null);

  // Lesson Content Form States
  const [lessonContent, setLessonContent] = useState('');
  const lessonEditorRef = useRef<HTMLTextAreaElement>(null);
  
  // Ref for Live Preview
  const previewRef = useRef<HTMLDivElement>(null);

  // Vocabulary Form States
  const [vocabEn, setVocabEn] = useState('');
  const [vocabBn, setVocabBn] = useState('');
  const [vocabPronunciation, setVocabPronunciation] = useState('');
  const [vocabSection, setVocabSection] = useState('');
  const [vocabUnit, setVocabUnit] = useState('');

  // Fetch Subjects when adminSelectedClass or tab changes
  useEffect(() => {
    fetchSubjects();
    setChapters([]); 
    setTopics([]);
    setSelectedSubjectId('');
    setFormulas([]);
    setSelectedChapterId('');
    setSelectedTopicId('');
    setLessonContent('');
    setManageQuestions([]);
  }, [adminSelectedClass]);

  // Fetch Chapters when Subject Changes
  useEffect(() => {
    if (selectedSubjectId) {
      fetchChapters(selectedSubjectId);
    } else {
      setChapters([]);
      setSelectedChapterId('');
    }
  }, [selectedSubjectId]);

  // Fetch Topics when Chapter Changes
  useEffect(() => {
    if (selectedChapterId) {
      fetchTopics(selectedChapterId);
      if (activeTab === 'content' && subTab === 'formula') {
        fetchFormulas(selectedChapterId);
      }
    } else {
      setTopics([]);
      setFormulas([]);
    }
  }, [selectedChapterId, activeTab, subTab]);

  // Fetch Lesson Content when Topic Selected
  useEffect(() => {
    if (selectedTopicId && subTab === 'lesson') {
       const topic = topics.find(t => t.id === selectedTopicId);
       setLessonContent(topic?.content || '');
    } else if (subTab === 'lesson' && !selectedTopicId && selectedChapterId) {
       // If Chapter selected but no Topic, check if chapter has intro content
       const chap = chapters.find(c => c.id === selectedChapterId);
       setLessonContent(chap?.content || '');
    }
  }, [selectedTopicId, selectedChapterId, subTab, topics, chapters]);

  // Fetch Vocabulary when Vocab Tab is active
  useEffect(() => {
    if (activeTab === 'vocab') {
      fetchVocabulary();
    }
  }, [activeTab]);
  
  // Fetch Questions when in Manage Tab and selections change
  useEffect(() => {
    if (activeTab === 'manage' && selectedChapterId) {
      const fetchQs = async () => {
        setLoading(true);
        try {
          let q = query(collection(db, 'questions'), where('chapterId', '==', selectedChapterId));
          if (selectedTopicId) {
             q = query(collection(db, 'questions'), where('chapterId', '==', selectedChapterId), where('topicId', '==', selectedTopicId));
          }
          const snap = await getDocs(q);
          setManageQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
        } catch (e) { console.error(e); }
        setLoading(false);
      };
      fetchQs();
    } else {
      setManageQuestions([]);
    }
  }, [activeTab, selectedChapterId, selectedTopicId]);

  // Trigger MathJax Typeset for Preview
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((window as any).MathJax) {
         if (previewRef.current) {
            // Clear previous MathJax processing marks if needed or just re-typeset
            (window as any).MathJax.typesetPromise && (window as any).MathJax.typesetPromise([previewRef.current])
              .catch((err: any) => {
                  if (err.message) console.log('MathJax error:', err.message);
              });
         }
      }
    }, 500); 
    return () => clearTimeout(timer);
  }, [formulas, formulaContent, lessonContent, activeTab, subTab]);

  const validateLatex = (latex: string): string | null => {
    if (!latex) return null;
    let braceCount = 0;
    let dollarCount = 0;
    let isEscaped = false;

    for (let i = 0; i < latex.length; i++) {
      const char = latex[i];

      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === '\\') {
        isEscaped = true;
        continue;
      }
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount < 0) return "Error: Unexpected closing brace '}'";
      }
      if (char === '$') dollarCount++;
    }

    if (braceCount > 0) return "Error: Missing closing brace '}'";
    if (dollarCount > 0 && dollarCount % 2 !== 0) return "Warning: Uneven number of '$' delimiters.";

    return null;
  };

  const handleFormulaContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setFormulaContent(val);
    setLatexError(validateLatex(val));
  };

  const fetchSubjects = async () => {
    const q = query(collection(db, 'subjects'), where('classLevel', '==', adminSelectedClass));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subject[];
    setSubjects(data);
  };

  const fetchChapters = async (subjId: string) => {
    const q = query(collection(db, 'chapters'), where('subjectId', '==', subjId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Chapter[];
    setChapters(data);
  };

  const fetchTopics = async (chapId: string) => {
    const q = query(collection(db, 'topics'), where('chapterId', '==', chapId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Topic[];
    setTopics(data);
  };

  const fetchFormulas = async (chapId: string) => {
    try {
      const q = query(collection(db, 'formulas'), where('chapterId', '==', chapId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Formula[];
      setFormulas(data);
    } catch (err: any) {
      console.error("Error fetching formulas", err.message);
    }
  };

  const fetchVocabulary = async () => {
    try {
      const q = collection(db, 'vocabulary');
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VocabularyWord[];
      data.sort((a, b) => {
         const secA = a.section || 'zz';
         const secB = b.section || 'zz';
         if (secA !== secB) return secA.localeCompare(secB);
         const unitA = a.unit || 'zz';
         const unitB = b.unit || 'zz';
         if (unitA !== unitB) return unitA.localeCompare(unitB);
         return a.en.localeCompare(b.en);
      });
      setVocabList(data);
    } catch (err: any) {
      console.error("Error fetching vocabulary", err.message);
    }
  };

  // --- Handlers ---

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = subjectTitle.trim();
    if (!trimmedTitle) return;
    
    setLoading(true);
    try {
      const q = query(collection(db, 'subjects'), where('classLevel', '==', adminSelectedClass), where('title', '==', trimmedTitle));
      const existingDocs = await getDocs(q);

      if (!existingDocs.empty) {
        setMsg({ type: 'error', text: `Subject "${trimmedTitle}" already exists!` });
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'subjects'), { title: trimmedTitle, chapterCount: 0, progress: 0, classLevel: adminSelectedClass });
      setMsg({ type: 'success', text: 'Subject added!' });
      setSubjectTitle('');
      fetchSubjects();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to add subject.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = chapterTitle.trim();
    if (!selectedSubjectId || !trimmedTitle) return;

    setLoading(true);
    try {
      const q = query(collection(db, 'chapters'), where('subjectId', '==', selectedSubjectId), where('title', '==', trimmedTitle));
      const existingDocs = await getDocs(q);
      if (!existingDocs.empty) {
        setMsg({ type: 'error', text: `Chapter already exists!` });
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'chapters'), { title: trimmedTitle, subjectId: selectedSubjectId, isLocked: false, duration: '45 min' });
      setMsg({ type: 'success', text: 'Chapter added!' });
      setChapterTitle('');
      fetchChapters(selectedSubjectId);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to add chapter.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = topicTitle.trim();
    if (!selectedSubjectId || !selectedChapterId || !trimmedTitle) {
       setMsg({ type: 'error', text: 'All fields required.' });
       return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'topics'), where('chapterId', '==', selectedChapterId), where('title', '==', trimmedTitle));
      const existingDocs = await getDocs(q);
      if (!existingDocs.empty) {
         setMsg({ type: 'error', text: 'Topic already exists.' });
         setLoading(false);
         return;
      }

      await addDoc(collection(db, 'topics'), { title: trimmedTitle, chapterId: selectedChapterId, subjectId: selectedSubjectId });
      setMsg({ type: 'success', text: 'Topic added!' });
      setTopicTitle('');
      fetchTopics(selectedChapterId);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to add topic.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if(!window.confirm("Delete topic?")) return;
    try {
       await deleteDoc(doc(db, 'topics', id));
       setMsg({ type: 'success', text: 'Topic deleted.' });
       setTopics(prev => prev.filter(t => t.id !== id));
    } catch(err) {
       setMsg({ type: 'error', text: 'Failed to delete topic.' });
    }
  };

  // --- Question Management Handlers ---

  const handleAddQuestion = async () => {
     if (!selectedSubjectId || !selectedChapterId) {
        setMsg({ type: 'error', text: 'Select Subject and Chapter first.' });
        return;
     }
     if (!qText.trim()) {
        setMsg({ type: 'error', text: 'Question text is required.' });
        return;
     }

     setLoading(true);
     try {
        const payload: any = {
           chapterId: selectedChapterId,
           topicId: selectedTopicId || null,
           type: qType,
           question: qText.trim(),
           explanation: qExplanation.trim(),
           createdAt: Date.now()
        };

        // Add type-specific fields
        if (qType === 'mcq' || qType === 'classification') {
           payload.options = qOptions.map(o => o.trim());
           payload.correctAnswer = qCorrect + 1; // Store as 1-based index to match existing schema
        } else if (qType === 'rewrite') {
           payload.correctAnswer = qRewriteAnswer.trim();
        } 
        // For Gap Fills, the answers are embedded in {{braces}} inside qText

        await addDoc(collection(db, 'questions'), payload);
        
        setMsg({ type: 'success', text: 'Question added successfully!' });
        
        // Reset form
        setQText('');
        setQExplanation('');
        setQRewriteAnswer('');
        setQOptions(['', '', '', '']);
     } catch (err: any) {
        console.error("Error adding question:", err.message);
        setMsg({ type: 'error', text: 'Failed to add question.' });
     } finally {
        setLoading(false);
     }
  };

  const handleSaveLesson = async () => {
    // If Topic is selected, save to topic. If only Chapter selected, save to Chapter.
    if (!selectedChapterId) {
      setMsg({ type: 'error', text: 'Select a chapter first.' });
      return;
    }

    setLoading(true);
    try {
      if (selectedTopicId) {
         // Save to Topic
         const topicRef = doc(db, 'topics', selectedTopicId);
         await setDoc(topicRef, { content: lessonContent }, { merge: true });
         setTopics(prev => prev.map(t => t.id === selectedTopicId ? { ...t, content: lessonContent } : t));
         setMsg({ type: 'success', text: 'Topic Lesson saved!' });
      } else {
         // Save to Chapter
         const chapRef = doc(db, 'chapters', selectedChapterId);
         await setDoc(chapRef, { content: lessonContent }, { merge: true });
         setChapters(prev => prev.map(c => c.id === selectedChapterId ? { ...c, content: lessonContent } : c));
         setMsg({ type: 'success', text: 'Chapter Intro saved!' });
      }
    } catch (err: any) {
      console.error("Save error:", err.message || String(err));
      setMsg({ type: 'error', text: 'Failed to save lesson content.' });
    } finally {
      setLoading(false);
    }
  };

  // ... (Other handlers like handleFormulaSubmit, handleAddVocab, etc. remain same)

  const handleFormulaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateLatex(formulaContent)?.startsWith("Error")) {
      setMsg({ type: 'error', text: "Fix LaTeX errors." });
      return;
    }
    if (!selectedSubjectId || !selectedChapterId || !formulaTitle.trim() || !formulaContent.trim()) {
      setMsg({ type: 'error', text: 'All fields required.' });
      return;
    }

    setLoading(true);
    try {
      if (editingFormulaId) {
        await setDoc(doc(db, 'formulas', editingFormulaId), { title: formulaTitle, content: formulaContent }, { merge: true });
        setMsg({ type: 'success', text: 'Formula updated!' });
      } else {
        await addDoc(collection(db, 'formulas'), { classLevel: adminSelectedClass, subjectId: selectedSubjectId, chapterId: selectedChapterId, title: formulaTitle, content: formulaContent, createdAt: Date.now() });
        setMsg({ type: 'success', text: 'Formula added!' });
      }
      setFormulaTitle('');
      setFormulaContent('');
      setLatexError(null);
      setEditingFormulaId(null);
      fetchFormulas(selectedChapterId);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to save formula.' });
    } finally {
      setLoading(false);
    }
  };

  const insertMarkdown = (before: string, after: string = '') => {
    if (!lessonEditorRef.current) return;
    const textarea = lessonEditorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    setLessonContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleAddVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocabEn.trim() || !vocabBn.trim()) {
      setMsg({ type: 'error', text: 'En/Bn required.' });
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'vocabulary'), {
        en: vocabEn.trim(),
        bn: vocabBn.trim(),
        pronunciation: vocabPronunciation.trim(),
        section: vocabSection.trim() || 'General',
        unit: vocabUnit.trim() || 'Unit 1'
      });
      setMsg({ type: 'success', text: 'Word added!' });
      setVocabEn(''); setVocabBn(''); setVocabPronunciation('');
      fetchVocabulary();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to add word.' });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkVocabUpload = async () => {
    if (!jsonInput.trim()) return;
    setLoading(true);
    try {
      const words = JSON.parse(jsonInput);
      if (!Array.isArray(words)) throw new Error();
      const batch = writeBatch(db);
      words.forEach((w: any) => {
        batch.set(doc(collection(db, 'vocabulary')), {
          en: w.en || '', bn: w.bn || '', pronunciation: w.pronunciation || '',
          section: w.section || 'General', unit: w.unit || 'Unit 1'
        });
      });
      await batch.commit();
      setMsg({ type: 'success', text: `${words.length} words uploaded!` });
      setJsonInput('');
      fetchVocabulary();
    } catch (err) {
      setMsg({ type: 'error', text: 'Invalid JSON format.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVocab = async (id: string) => {
    if (!window.confirm("Delete word?")) return;
    try {
      await deleteDoc(doc(db, 'vocabulary', id));
      setVocabList(prev => prev.filter(w => w.id !== id));
    } catch (err) { setMsg({ type: 'error', text: 'Failed.' }); }
  };

  const handleBulkMCQUpload = async () => {
    if (!selectedSubjectId || !selectedChapterId || !jsonInput.trim()) {
      setMsg({ type: 'error', text: 'Select context & valid JSON.' });
      return;
    }
    setLoading(true);
    try {
      const mcqs = JSON.parse(jsonInput);
      if (!Array.isArray(mcqs)) throw new Error();
      const batch = writeBatch(db);
      mcqs.forEach((mcq: any) => {
        batch.set(doc(collection(db, 'questions')), {
           chapterId: selectedChapterId, 
           topicId: selectedTopicId || null,
           type: 'mcq', // Default to MCQ for bulk unless specified
           question: mcq.question, 
           options: mcq.options, 
           correctAnswer: mcq.correctAnswer, 
           explanation: mcq.explanation || ''
        });
      });
      await batch.commit();
      setMsg({ type: 'success', text: `${mcqs.length} Questions uploaded!` });
      setJsonInput('');
    } catch (err) {
      setMsg({ type: 'error', text: 'Invalid JSON or Upload failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm("Delete subject?")) return;
    try { await deleteDoc(doc(db, 'subjects', id)); setSubjects(prev => prev.filter(s => s.id !== id)); } 
    catch (e) { setMsg({ type: 'error', text: 'Failed.' }); }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!window.confirm("Delete chapter?")) return;
    try { await deleteDoc(doc(db, 'chapters', id)); setChapters(prev => prev.filter(c => c.id !== id)); } 
    catch (e) { setMsg({ type: 'error', text: 'Failed.' }); }
  };

  const handleDeleteFormula = async (id: string) => {
    if (!window.confirm("Delete formula?")) return;
    try { await deleteDoc(doc(db, 'formulas', id)); setFormulas(prev => prev.filter(f => f.id !== id)); } 
    catch (e) { setMsg({ type: 'error', text: 'Failed.' }); }
  };
  
  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Permanently delete this question?")) return;
    try {
      await deleteDoc(doc(db, 'questions', id));
      setManageQuestions(prev => prev.filter(q => q.id !== id));
      setMsg({ type: 'success', text: 'Question deleted.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to delete question.' });
    }
  };

  // --- UI Components ---

  const TabButton = ({ id, label, icon: Icon, activeId, onClick }: any) => (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
        activeId === id 
          ? 'bg-green-600 text-white shadow-lg shadow-green-900/30' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );

  const SubTabButton = ({ id, label, activeId, onClick }: any) => (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
        activeId === id ? 'border-green-500 text-green-500' : 'border-transparent text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );

  const InputField = ({ label, value, onChange, placeholder, icon: Icon }: any) => (
    <div className="space-y-1.5">
       {label && <label className="text-xs font-medium text-gray-400 ml-1">{label}</label>}
       <div className="relative">
          {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />}
          <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full bg-black/20 border border-white/10 rounded-xl py-3 ${Icon ? 'pl-10' : 'pl-4'} pr-4 text-sm text-white focus:outline-none focus:border-green-500 transition-all focus:bg-black/40`}
          />
       </div>
    </div>
  );

  const SelectField = ({ label, value, onChange, options, disabled, placeholder = "Select..." }: any) => (
    <div className="space-y-1.5">
       {label && <label className="text-xs font-medium text-gray-400 ml-1">{label}</label>}
       <div className="relative">
          <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-green-500 appearance-none disabled:opacity-50 transition-all cursor-pointer"
          >
             <option value="">{placeholder}</option>
             {options.map((o: any) => <option key={o.id} value={o.id} className="bg-[#1E1E1E]">{o.title}</option>)}
          </select>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 rotate-90 pointer-events-none" />
       </div>
    </div>
  );

  const ToolbarBtn = ({ icon: Icon, onClick, label }: any) => (
     <button 
       onClick={(e) => { e.preventDefault(); onClick(); }}
       className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
       title={label}
     >
        <Icon className="w-4 h-4" />
     </button>
  );

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-right-8 duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 mt-2">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2">
           <ArrowLeft className="w-6 h-6 text-gray-400 hover:text-white" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Admin Panel
          </h2>
          <p className="text-xs text-gray-500">Content Management System</p>
        </div>
      </div>

      {/* Context Selector */}
      <div className="mb-6 bg-app-card p-4 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-8 -mt-8 blur-2xl"></div>
         <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-green-500" />
         </div>
         <div className="flex-1">
            <label className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Current Class</label>
            <select 
               value={adminSelectedClass} 
               onChange={(e) => setAdminSelectedClass(e.target.value)}
               className="w-full bg-transparent text-xl font-bold text-white focus:outline-none cursor-pointer mt-0.5"
            >
               {classes.map(c => <option key={c} value={c} className="bg-[#1E1E1E]">{c}</option>)}
            </select>
         </div>
         <ChevronRight className="w-5 h-5 text-gray-500" />
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-4 mb-2">
         <TabButton id="structure" label="Structure" icon={Layers} activeId={activeTab} onClick={() => setActiveTab('structure')} />
         <TabButton id="content" label="Content" icon={FileJson} activeId={activeTab} onClick={() => setActiveTab('content')} />
         <TabButton id="vocab" label="Vocabulary" icon={BookA} activeId={activeTab} onClick={() => setActiveTab('vocab')} />
         <TabButton id="manage" label="Manage" icon={Database} activeId={activeTab} onClick={() => setActiveTab('manage')} />
      </div>

      {/* Feedback Message */}
      {msg && (
        <div className={`mb-6 p-3 rounded-xl border flex items-center gap-3 ${msg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{msg.text}</span>
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* --- TAB: STRUCTURE (Subject, Chapter, Topic) --- */}
      {activeTab === 'structure' && (
         <div className="space-y-6">
            <div className="flex border-b border-white/10">
               <SubTabButton id="subject" label="Add Subject" activeId={subTab} onClick={() => setSubTab('subject')} />
               <SubTabButton id="chapter" label="Add Chapter" activeId={subTab} onClick={() => setSubTab('chapter')} />
               <SubTabButton id="topic" label="Add Topic" activeId={subTab} onClick={() => setSubTab('topic')} />
            </div>
            {/* ... Structure Forms (Subject/Chapter/Topic) ... */}
            <div className="bg-app-card p-5 rounded-2xl border border-white/5 shadow-lg">
               {subTab === 'subject' && (
                  <form onSubmit={handleAddSubject} className="space-y-4">
                     <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/10 mb-2">
                        <p className="text-xs text-green-400">Adding to <span className="font-bold">{adminSelectedClass}</span></p>
                     </div>
                     <InputField label="Subject Name" value={subjectTitle} onChange={(e: any) => setSubjectTitle(e.target.value)} placeholder="e.g. Mathematics" icon={BookOpen} />
                     <button disabled={loading} className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 disabled:opacity-50 flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Plus className="w-4 h-4" /> Create Subject</>}
                     </button>
                  </form>
               )}

               {subTab === 'chapter' && (
                  <form onSubmit={handleAddChapter} className="space-y-4">
                     <SelectField label="Target Subject" value={selectedSubjectId} onChange={(e: any) => setSelectedSubjectId(e.target.value)} options={subjects} />
                     <InputField label="Chapter Title" value={chapterTitle} onChange={(e: any) => setChapterTitle(e.target.value)} placeholder="e.g. Algebra Basics" icon={Layers} />
                     <button disabled={loading} className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 disabled:opacity-50 flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Plus className="w-4 h-4" /> Create Chapter</>}
                     </button>
                  </form>
               )}

               {subTab === 'topic' && (
                  <form onSubmit={handleAddTopic} className="space-y-4">
                     <div className="grid grid-cols-2 gap-3">
                        <SelectField label="Subject" value={selectedSubjectId} onChange={(e: any) => setSelectedSubjectId(e.target.value)} options={subjects} />
                        <SelectField label="Chapter" value={selectedChapterId} onChange={(e: any) => setSelectedChapterId(e.target.value)} options={chapters} disabled={!selectedSubjectId} />
                     </div>
                     <InputField label="Topic Name" value={topicTitle} onChange={(e: any) => setTopicTitle(e.target.value)} placeholder="e.g. Linear Equations" icon={Tag} />
                     <button disabled={loading} className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 disabled:opacity-50 flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Plus className="w-4 h-4" /> Create Topic</>}
                     </button>
                  </form>
               )}
            </div>
            {/* Topic List */}
            {subTab === 'topic' && selectedChapterId && (
               <div className="bg-app-card p-5 rounded-2xl border border-white/5">
                  <h3 className="text-sm font-bold text-white mb-3">Topics in Chapter</h3>
                  <div className="space-y-2">
                     {topics.length === 0 ? <p className="text-xs text-gray-500">No topics yet.</p> : topics.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                           <span className="text-sm text-gray-300">{t.title}</span>
                           <button onClick={() => handleDeleteTopic(t.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>
      )}

      {/* --- TAB: CONTENT (Formula, Lesson, Question Builder, Bulk MCQ) --- */}
      {activeTab === 'content' && (
         <div className="space-y-6">
            <div className="flex border-b border-white/10 overflow-x-auto">
               <SubTabButton id="lesson" label="Lessons" activeId={subTab} onClick={() => setSubTab('lesson')} />
               <SubTabButton id="formula" label="Formulas" activeId={subTab} onClick={() => setSubTab('formula')} />
               <SubTabButton id="question" label="Add Question" activeId={subTab} onClick={() => setSubTab('question')} />
               <SubTabButton id="bulk" label="Bulk Upload" activeId={subTab} onClick={() => setSubTab('bulk')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
               <SelectField label="Subject" value={selectedSubjectId} onChange={(e: any) => setSelectedSubjectId(e.target.value)} options={subjects} />
               <SelectField label="Chapter" value={selectedChapterId} onChange={(e: any) => setSelectedChapterId(e.target.value)} options={chapters} disabled={!selectedSubjectId} />
            </div>

            {subTab === 'lesson' && (
               <div className="space-y-6">
                  <div className="bg-app-card p-5 rounded-2xl border border-white/5 shadow-lg">
                     <SelectField label="Select Topic to Edit (Optional)" value={selectedTopicId} onChange={(e: any) => setSelectedTopicId(e.target.value)} options={topics} disabled={!selectedChapterId} placeholder="-- Edit Chapter Intro --" />
                     {/* Lesson Editor (Markdown) */}
                     <div className="mt-4">
                        <label className="text-xs font-medium text-gray-400 ml-1 mb-2 block">Lesson Content (Markdown)</label>
                        <div className="flex flex-wrap gap-1 mb-2 p-1 bg-white/5 rounded-lg border border-white/5">
                           <ToolbarBtn icon={Bold} onClick={() => insertMarkdown('**', '**')} label="Bold" />
                           <ToolbarBtn icon={Italic} onClick={() => insertMarkdown('*', '*')} label="Italic" />
                           <div className="w-px h-5 bg-white/10 mx-1 my-auto"></div>
                           <ToolbarBtn icon={Heading1} onClick={() => insertMarkdown('# ')} label="Heading 1" />
                           <ToolbarBtn icon={Heading2} onClick={() => insertMarkdown('## ')} label="Heading 2" />
                           <div className="w-px h-5 bg-white/10 mx-1 my-auto"></div>
                           <ToolbarBtn icon={List} onClick={() => insertMarkdown('- ')} label="List" />
                           <ToolbarBtn icon={Quote} onClick={() => insertMarkdown('> ')} label="Quote" />
                           <ToolbarBtn icon={Code} onClick={() => insertMarkdown('$$\n', '\n$$')} label="Math Block" />
                           <div className="w-px h-5 bg-white/10 mx-1 my-auto"></div>
                           <ToolbarBtn icon={HelpCircle} onClick={() => insertMarkdown('\nQ: Question?\nA: Answer\n')} label="Q&A" />
                           <div className="w-px h-5 bg-white/10 mx-1 my-auto"></div>
                           <ToolbarBtn icon={BookA} onClick={() => insertMarkdown('{{', '|Meaning}}')} label="Word Meaning" />
                           <div className="w-px h-5 bg-white/10 mx-1 my-auto"></div>
                           <ToolbarBtn icon={SplitSquareHorizontal} onClick={() => insertMarkdown('\n---\n')} label="New Slide" />
                        </div>
                        <div className="relative">
                           <textarea 
                              ref={lessonEditorRef}
                              value={lessonContent} 
                              onChange={(e) => setLessonContent(e.target.value)} 
                              rows={15} 
                              className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-blue-500 leading-relaxed font-mono"
                              placeholder="Start writing..."
                              disabled={!selectedChapterId}
                           />
                        </div>
                     </div>
                     <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5 min-h-[100px]" ref={previewRef}>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Markdown Preview</p>
                        <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white whitespace-pre-wrap text-sm font-mono opacity-80">
                           {lessonContent || <span className="text-gray-600 italic">Preview text...</span>}
                        </div>
                     </div>
                     <button onClick={handleSaveLesson} disabled={loading || !selectedChapterId} className="w-full mt-4 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20">
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><FileText className="w-4 h-4" /> Save Content</>}
                     </button>
                  </div>
               </div>
            )}

            {subTab === 'question' && (
               <div className="bg-app-card p-5 rounded-2xl border border-white/5 shadow-lg space-y-5">
                   <SelectField label="Topic (Optional)" value={selectedTopicId} onChange={(e: any) => setSelectedTopicId(e.target.value)} options={topics} placeholder="-- Any Topic --" disabled={!selectedChapterId} />
                   
                   {/* Question Type Selector */}
                   <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 ml-1">Question Type</label>
                      <select
                         value={qType}
                         onChange={(e) => setQType(e.target.value as QuestionType)}
                         className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-green-500 appearance-none cursor-pointer"
                      >
                         <option value="mcq">Multiple Choice (MCQ)</option>
                         <option value="gap_with_clues">Gap Fill (With Clues)</option>
                         <option value="gap_no_clues">Gap Fill (No Clues / Right Form of Verbs)</option>
                         <option value="rewrite">Text Transformation / Punctuation</option>
                         <option value="classification">Classification / Part of Speech</option>
                      </select>
                   </div>

                   {/* Question Text Input */}
                   <div className="space-y-1.5">
                      <div className="flex justify-between">
                         <label className="text-xs font-medium text-gray-400 ml-1">Question / Sentence</label>
                         {(qType.includes('gap')) && <span className="text-[10px] text-green-400">Use {'{{answer}}'} for blanks</span>}
                      </div>
                      <textarea
                         value={qText}
                         onChange={(e) => setQText(e.target.value)}
                         rows={3}
                         placeholder={qType === 'mcq' ? "Enter question..." : qType.includes('gap') ? "The sun {{rises}} in the east." : "Change to Passive: I eat rice."}
                         className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-green-500 font-mono"
                      />
                   </div>

                   {/* Options for MCQ / Classification */}
                   {(qType === 'mcq' || qType === 'classification') && (
                      <div className="space-y-3">
                         <label className="text-xs font-medium text-gray-400 ml-1">Options</label>
                         {qOptions.map((opt, i) => (
                            <div key={i} className="flex gap-2">
                               <div className="w-8 h-10 flex items-center justify-center bg-white/5 rounded-lg text-xs font-bold text-gray-500">{String.fromCharCode(65+i)}</div>
                               <input 
                                  type="text" 
                                  value={opt} 
                                  onChange={(e) => {
                                     const newOpts = [...qOptions];
                                     newOpts[i] = e.target.value;
                                     setQOptions(newOpts);
                                  }}
                                  className={`flex-1 bg-black/20 border rounded-xl px-4 text-sm text-white focus:outline-none ${i === qCorrect ? 'border-green-500' : 'border-white/10'}`}
                                  placeholder={`Option ${i+1}`}
                               />
                               <button 
                                  onClick={() => setQCorrect(i)}
                                  className={`p-2 rounded-lg ${i === qCorrect ? 'bg-green-500 text-black' : 'bg-white/5 text-gray-400'}`}
                                  title="Mark Correct"
                               >
                                  <CheckCircle className="w-5 h-5" />
                               </button>
                            </div>
                         ))}
                      </div>
                   )}

                   {/* Correct Answer for Rewrite */}
                   {qType === 'rewrite' && (
                      <InputField label="Correct Answer Text" value={qRewriteAnswer} onChange={(e: any) => setQRewriteAnswer(e.target.value)} placeholder="e.g. Rice is eaten by me." />
                   )}

                   <InputField label="Explanation (Optional)" value={qExplanation} onChange={(e: any) => setQExplanation(e.target.value)} placeholder="Why is this correct?" />

                   <button onClick={handleAddQuestion} disabled={loading} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-500 disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-green-900/20">
                      {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Plus className="w-4 h-4" /> Add Question</>}
                   </button>
               </div>
            )}

            {subTab === 'formula' && (
               <div className="space-y-6">
                  {/* Formula Editor UI */}
                  <div className="bg-app-card p-5 rounded-2xl border border-white/5 shadow-lg">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-pink-400 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Formula Editor</h3>
                        {editingFormulaId && <button onClick={() => { setEditingFormulaId(null); setFormulaTitle(''); setFormulaContent(''); }} className="text-xs text-gray-400 hover:text-white">Cancel Edit</button>}
                     </div>
                     <form onSubmit={handleFormulaSubmit} className="space-y-4">
                        <InputField value={formulaTitle} onChange={(e: any) => setFormulaTitle(e.target.value)} placeholder="Title (e.g. Pythagoras)" />
                        <div className="relative">
                           <textarea 
                              value={formulaContent} onChange={handleFormulaContentChange} rows={3} 
                              className={`w-full bg-black/30 border rounded-xl p-3 text-sm font-mono text-white focus:outline-none ${latexError?.startsWith('Error') ? 'border-red-500' : 'border-white/10 focus:border-pink-500'}`} 
                              placeholder="LaTeX: a^2 + b^2 = c^2"
                           />
                           {latexError && <p className={`text-[10px] mt-1 ${latexError.startsWith('Error') ? 'text-red-400' : 'text-yellow-400'}`}>{latexError}</p>}
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 min-h-[60px] flex items-center justify-center" ref={previewRef}>
                           {formulaContent ? <div className="text-lg text-white">{formulaContent}</div> : <span className="text-xs text-gray-600">Preview will appear here</span>}
                        </div>
                        <button disabled={loading} className="w-full py-3 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-500 disabled:opacity-50 flex justify-center items-center gap-2">
                           {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <>{editingFormulaId ? <RefreshCw className="w-4 h-4" /> : <Plus className="w-4 h-4" />} Save Formula</>}
                        </button>
                     </form>
                  </div>
                  {/* Formula List */}
                  {selectedChapterId && (
                     <div className="bg-app-card rounded-2xl border border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-white/5"><h4 className="text-xs font-bold text-gray-400 uppercase">Existing Formulas</h4></div>
                        {formulas.length === 0 ? <p className="p-4 text-xs text-gray-500 text-center">No formulas found.</p> : (
                           formulas.map(f => (
                              <div key={f.id} className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 flex justify-between items-start group">
                                 <div>
                                    <p className="text-xs font-bold text-pink-400 mb-1">{f.title}</p>
                                    <p className="text-sm text-gray-300">{f.content}</p>
                                 </div>
                                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setFormulaTitle(f.title); setFormulaContent(f.content); setEditingFormulaId(f.id || null); }} className="p-1.5 bg-yellow-500/10 text-yellow-500 rounded"><Pencil className="w-3 h-3" /></button>
                                    <button onClick={() => f.id && handleDeleteFormula(f.id)} className="p-1.5 bg-red-500/10 text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  )}
               </div>
            )}

            {subTab === 'bulk' && (
               <div className="bg-app-card p-5 rounded-2xl border border-white/5 shadow-lg space-y-4">
                   <SelectField label="Topic (Optional)" value={selectedTopicId} onChange={(e: any) => setSelectedTopicId(e.target.value)} options={topics} placeholder="-- Any Topic --" disabled={!selectedChapterId} />
                   <div className="space-y-2">
                      <div className="flex justify-between items-center">
                         <label className="text-xs font-bold text-gray-400 flex items-center gap-1"><Code className="w-3 h-3" /> JSON Data</label>
                         <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded">Array of Objects</span>
                      </div>
                      <textarea 
                         value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} rows={10} 
                         className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 font-mono text-xs text-green-500 focus:outline-none focus:border-green-500"
                         placeholder={`[\n  {\n    "question": "2+2=?",\n    "options": ["3", "4", "5", "6"],\n    "correctAnswer": 1,\n    "explanation": "Basic math",\n    "type": "mcq"\n  }\n]`}
                      />
                   </div>
                   <button onClick={handleBulkMCQUpload} disabled={loading} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-500 disabled:opacity-50 flex justify-center items-center gap-2">
                      {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Upload className="w-4 h-4" /> Upload Questions</>}
                   </button>
               </div>
            )}
         </div>
      )}

      {/* --- TAB: VOCABULARY --- */}
      {activeTab === 'vocab' && (
         <div className="space-y-6">
            <div className="bg-app-card p-1 rounded-xl border border-white/5 flex">
               <button onClick={() => setVocabMode('single')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${vocabMode === 'single' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Single Entry</button>
               <button onClick={() => setVocabMode('bulk')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${vocabMode === 'bulk' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Bulk JSON</button>
            </div>
            {/* Vocab Form and List logic (kept as is) */}
            <div className="bg-app-card p-5 rounded-2xl border border-white/5 shadow-lg">
               {vocabMode === 'single' ? (
                  <form onSubmit={handleAddVocab} className="space-y-4">
                     <div className="grid grid-cols-2 gap-3">
                        <InputField value={vocabSection} onChange={(e: any) => setVocabSection(e.target.value)} placeholder="Section (e.g. Beginners)" />
                        <InputField value={vocabUnit} onChange={(e: any) => setVocabUnit(e.target.value)} placeholder="Unit (e.g. Unit 1)" />
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <InputField value={vocabEn} onChange={(e: any) => setVocabEn(e.target.value)} placeholder="English Word" />
                        <InputField value={vocabBn} onChange={(e: any) => setVocabBn(e.target.value)} placeholder="Bangla Meaning" />
                        <InputField value={vocabPronunciation} onChange={(e: any) => setVocabPronunciation(e.target.value)} placeholder="Pronunciation" />
                     </div>
                     <button disabled={loading} className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 disabled:opacity-50 flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Plus className="w-4 h-4" /> Add Word</>}
                     </button>
                  </form>
               ) : (
                  <div className="space-y-4">
                     <textarea 
                        value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} rows={8} 
                        className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl p-4 font-mono text-xs text-purple-400 focus:outline-none focus:border-purple-500"
                        placeholder="Paste JSON here..."
                     />
                     <button onClick={handleBulkVocabUpload} disabled={loading} className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 disabled:opacity-50 flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Upload className="w-4 h-4" /> Upload Words</>}
                     </button>
                  </div>
               )}
            </div>
            <div className="bg-app-card rounded-2xl border border-white/5 overflow-hidden max-h-[400px] overflow-y-auto">
               <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center sticky top-0 backdrop-blur-md">
                  <h4 className="text-xs font-bold text-gray-400 uppercase">Vocabulary Database ({vocabList.length})</h4>
                  <button onClick={fetchVocabulary} className="p-1 hover:bg-white/10 rounded"><RefreshCw className="w-3.5 h-3.5 text-gray-400" /></button>
               </div>
               {vocabList.map((w, i) => (
                  <div key={w.id || i} className="p-3 border-b border-white/5 hover:bg-white/5 flex justify-between items-center group">
                     <div>
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-bold text-white">{w.en}</span>
                           <span className="text-xs text-gray-500 font-mono">{w.pronunciation}</span>
                        </div>
                        <p className="text-xs text-gray-400">{w.bn}</p>
                     </div>
                     <button onClick={() => w.id && handleDeleteVocab(w.id)} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* --- TAB: MANAGE (Delete Items) --- */}
      {activeTab === 'manage' && (
         <div className="space-y-6">
             {/* 1. Subjects Manager */}
             <div className="bg-app-card rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 bg-white/5 border-b border-white/5"><h3 className="text-sm font-bold text-white">Manage Subjects</h3></div>
                {subjects.length === 0 ? <p className="p-4 text-xs text-gray-500">No subjects found for {adminSelectedClass}.</p> : subjects.map(s => (
                   <div key={s.id} className="p-4 border-b border-white/5 flex justify-between items-center hover:bg-white/5">
                      <span className="text-sm text-gray-300">{s.title}</span>
                      <button onClick={() => handleDeleteSubject(s.id)} className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg" title="Delete Subject"><Trash2 className="w-4 h-4" /></button>
                   </div>
                ))}
             </div>

             {/* 2. Chapters Manager */}
             <div className="bg-app-card rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                   <h3 className="text-sm font-bold text-white">Manage Chapters</h3>
                   {/* Reusing SelectField logic but simplified */}
                   <select 
                      value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} 
                      className="bg-black/30 border border-white/10 rounded-lg text-xs p-1 text-gray-300 outline-none max-w-[150px]"
                   >
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                   </select>
                </div>
                {!selectedSubjectId ? <p className="p-4 text-xs text-gray-500">Select a subject to view chapters.</p> : 
                 chapters.length === 0 ? <p className="p-4 text-xs text-gray-500">No chapters found.</p> : 
                 chapters.map(c => (
                   <div key={c.id} className="p-4 border-b border-white/5 flex justify-between items-center hover:bg-white/5">
                      <span className="text-sm text-gray-300">{c.title}</span>
                      <button onClick={() => handleDeleteChapter(c.id)} className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg" title="Delete Chapter"><Trash2 className="w-4 h-4" /></button>
                   </div>
                ))}
             </div>

             {/* 3. Topics Manager */}
             <div className="bg-app-card rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                   <h3 className="text-sm font-bold text-white">Manage Topics</h3>
                   <div className="flex gap-2">
                       <select 
                          value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} 
                          className="bg-black/30 border border-white/10 rounded-lg text-xs p-1 text-gray-300 outline-none max-w-[120px]"
                       >
                          <option value="">Subject...</option>
                          {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                       </select>
                       <select 
                          value={selectedChapterId} onChange={(e) => setSelectedChapterId(e.target.value)} 
                          className="bg-black/30 border border-white/10 rounded-lg text-xs p-1 text-gray-300 outline-none max-w-[120px]"
                          disabled={!selectedSubjectId}
                       >
                          <option value="">Chapter...</option>
                          {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                       </select>
                   </div>
                </div>
                {!selectedChapterId ? <p className="p-4 text-xs text-gray-500">Select Subject & Chapter to view topics.</p> : 
                 topics.length === 0 ? <p className="p-4 text-xs text-gray-500">No topics found.</p> : 
                 topics.map(t => (
                   <div key={t.id} className="p-4 border-b border-white/5 flex justify-between items-center hover:bg-white/5">
                      <span className="text-sm text-gray-300">{t.title}</span>
                      <button onClick={() => handleDeleteTopic(t.id)} className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg" title="Delete Topic"><Trash2 className="w-4 h-4" /></button>
                   </div>
                ))}
             </div>

             {/* 4. Questions Manager */}
             <div className="bg-app-card rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 bg-white/5 border-b border-white/5 flex flex-col gap-3">
                   <h3 className="text-sm font-bold text-white">Manage Questions (MCQ / Gaps)</h3>
                   <div className="flex gap-2 flex-wrap">
                       <select 
                          value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} 
                          className="bg-black/30 border border-white/10 rounded-lg text-xs p-2 text-gray-300 outline-none"
                       >
                          <option value="">Subject...</option>
                          {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                       </select>
                       <select 
                          value={selectedChapterId} onChange={(e) => setSelectedChapterId(e.target.value)} 
                          className="bg-black/30 border border-white/10 rounded-lg text-xs p-2 text-gray-300 outline-none"
                          disabled={!selectedSubjectId}
                       >
                          <option value="">Chapter...</option>
                          {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                       </select>
                       <select 
                          value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)} 
                          className="bg-black/30 border border-white/10 rounded-lg text-xs p-2 text-gray-300 outline-none"
                          disabled={!selectedChapterId}
                       >
                          <option value="">All Topics</option>
                          {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                       </select>
                   </div>
                </div>
                
                <div className="max-h-[500px] overflow-y-auto">
                    {!selectedChapterId ? <p className="p-4 text-xs text-gray-500">Select Subject & Chapter to view questions.</p> : 
                     manageQuestions.length === 0 ? <p className="p-4 text-xs text-gray-500">No questions found.</p> : 
                     manageQuestions.map((q, i) => (
                       <div key={q.id || i} className="p-4 border-b border-white/5 flex flex-col gap-2 hover:bg-white/5 group">
                          <div className="flex justify-between items-start">
                              <div className="flex-1 pr-4">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 uppercase">{q.type || 'MCQ'}</span>
                                      {q.topicId && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Tag className="w-3 h-3" /> {topics.find(t=>t.id===q.topicId)?.title || 'Unknown Topic'}</span>}
                                  </div>
                                  <p className="text-sm text-gray-200 line-clamp-2">{q.question}</p>
                              </div>
                              <button onClick={() => q.id && handleDeleteQuestion(q.id)} className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg shrink-0" title="Delete Question">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                       </div>
                    ))}
                </div>
             </div>
         </div>
      )}

    </div>
  );
};

export default AdminPanel;
