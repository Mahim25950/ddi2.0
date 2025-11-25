import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, BookOpen, PlayCircle, Type, Volume2, Pause, 
  Layers, AlignLeft, Maximize2, Minimize2, Save, HelpCircle, 
  ChevronRight, ChevronLeft, ChevronDown
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { Topic } from '../types';

interface LessonViewProps {
  topic: Topic;
  user: User | null;
  onBack: () => void;
  onStartPractice: () => void;
}

// --- Helper Components ---

const GlossaryItem: React.FC<{ word: string; meaning: string }> = ({ word, meaning }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span className="relative inline-block mx-1 z-10">
      <span 
        className="text-yellow-400 border-b border-dashed border-yellow-500/50 cursor-pointer hover:bg-yellow-500/10 transition-colors px-0.5 rounded font-medium"
        onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
      >
        {word}
      </span>
      
      {showTooltip && (
        <span 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl shadow-xl border border-white/20 whitespace-normal min-w-[150px] text-center z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl"
          onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
        >
           {meaning}
           <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
        </span>
      )}
    </span>
  );
};

const QAItem: React.FC<{ question: string; answer: string; vocabMap?: Record<string, string> }> = ({ question, answer, vocabMap }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Parse inline content for question and answer with vocab support
  const parsedQ = parseInline(question, vocabMap);
  const parsedA = parseInline(answer, vocabMap);

  return (
    <div 
      onClick={() => setIsOpen(!isOpen)}
      className="my-4 p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors group"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-3">
           <div className={`mt-0.5 p-1 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
              <HelpCircle className="w-4 h-4" />
           </div>
           <div>
              <div className="font-medium text-gray-200 text-sm">{parsedQ}</div>
           </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="mt-3 pl-9 text-sm text-green-400 border-t border-white/5 pt-3 animate-in slide-in-from-top-1">
           {parsedA}
        </div>
      )}
    </div>
  );
};

// --- Parser Logic ---

interface Block {
  type: 'header' | 'paragraph' | 'list' | 'blockquote' | 'math' | 'table' | 'hr' | 'qa';
  content?: string;
  items?: string[];
  level?: number;
  rows?: string[][];
  headers?: string[];
  question?: string;
  answer?: string;
}

// Helper to highlight words from vocabulary map automatically
function processVocabulary(text: string, map?: Record<string, string>): React.ReactNode[] | string {
  if (!map || !text || Object.keys(map).length === 0) return text;
  
  // Split by word boundaries, keeping delimiters to preserve punctuation
  // Regex matches words consisting of letters, optionally containing an apostrophe (e.g. "It's", "Word")
  const parts = text.split(/(\b[a-zA-Z]+(?:['’][a-z]+)?\b)/g);
  
  return parts.map((part, i) => {
      const lower = part.toLowerCase();
      // Check if word exists in map
      if (map[lower]) {
          return <GlossaryItem key={i} word={part} meaning={map[lower]} />;
      }
      return part;
  });
}

// Function to parse inline formatting (Bold, Italic, Math, Glossary)
function parseInline(text: string, vocabMap?: Record<string, string>): React.ReactNode {
  if (!text) return null;
  
  // Split by Inline Math ($...$)
  const parts = text.split(/(\$[^$]+\$)/g);
  
  return parts.map((part, idx) => {
     // 1. Inline Math
     if (part.startsWith('$') && part.endsWith('$')) {
        return <span key={idx} className="inline-math text-blue-300 font-serif mx-0.5">{part}</span>;
     }

     // 2. Glossary {{word|meaning}} (Manual Override)
     const subParts = part.split(/(\{\{.*?\}\})/g);
     
     return (
       <span key={idx}>
         {subParts.map((sp, spIdx) => {
            if (sp.startsWith('{{') && sp.endsWith('}}')) {
               const inner = sp.slice(2, -2);
               const sepIndex = inner.indexOf('|');
               if (sepIndex > -1) {
                 const word = inner.substring(0, sepIndex);
                 const meaning = inner.substring(sepIndex + 1);
                 return <GlossaryItem key={spIdx} word={word} meaning={meaning} />;
               }
               return sp;
            }

            // 3. Bold (**text**)
            const boldParts = sp.split(/(\*\*[^*]+\*\*)/g);
            return (
               <span key={spIdx}>
                  {boldParts.map((bp, bpIdx) => {
                     if (bp.startsWith('**') && bp.endsWith('**')) {
                        return <strong key={bpIdx} className="text-white font-bold">{bp.slice(2, -2)}</strong>;
                     }
                     // 4. Italic (*text*)
                     const italicParts = bp.split(/(\*[^*]+\*)/g);
                     return (
                        <span key={bpIdx}>
                           {italicParts.map((ip, ipIdx) => {
                              if (ip.startsWith('*') && ip.endsWith('*')) {
                                 return <em key={ipIdx} className="text-gray-300 italic">{ip.slice(1, -1)}</em>;
                              }
                              
                              // 5. Automatic Vocabulary Highlighting (Leaf Node)
                              return processVocabulary(ip, vocabMap);
                           })}
                        </span>
                     );
                  })}
               </span>
            );
         })}
       </span>
     );
  });
}

const parseMarkdown = (text: string): Block[] => {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks: Block[] = [];
  
  let currentBlock: Block | null = null;
  
  const finishBlock = () => {
    if (currentBlock) {
      blocks.push(currentBlock);
      currentBlock = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trim = line.trim();

    // Math Blocks ($$)
    if (trim.startsWith('$$')) {
      finishBlock();
      const mathLines = [line];
      if (!trim.endsWith('$$') || trim === '$$') {
          i++;
          while (i < lines.length) {
             const nextLine = lines[i];
             mathLines.push(nextLine);
             if (nextLine.trim().endsWith('$$')) break;
             i++;
          }
      }
      const rawMath = mathLines.join('\n').replace(/^\$\$|\$\$$/g, '');
      blocks.push({ type: 'math', content: rawMath });
      continue;
    }

    // Tables (| ... |)
    if (trim.startsWith('|') && trim.includes('|', 1)) {
       if (currentBlock?.type !== 'table') {
         finishBlock();
         currentBlock = { type: 'table', rows: [], headers: [] };
       }
       const cells = trim.split('|').map(c => c.trim()).filter(c => c !== '');
       // Check for separator row
       const isSeparator = cells.every(c => c.match(/^-+$/));
       
       if (isSeparator && currentBlock?.type === 'table') {
          if (currentBlock.rows && currentBlock.rows.length > 0) {
             currentBlock.headers = currentBlock.rows.pop();
          }
       } else if (currentBlock?.type === 'table') {
          currentBlock.rows?.push(cells);
       }
       continue;
    } else {
       if (currentBlock?.type === 'table') finishBlock();
    }

    // Headers (#)
    if (trim.startsWith('#')) {
       finishBlock();
       const level = trim.match(/^#+/)?.[0].length || 1;
       blocks.push({ type: 'header', level, content: trim.replace(/^#+\s*/, '') });
       continue;
    }

    // Horizontal Rule
    if (trim === '---' || trim === '***') {
       finishBlock();
       blocks.push({ type: 'hr' });
       continue;
    }

    // Blockquotes (>)
    if (trim.startsWith('//')) {
        // Comment, skip
        continue;
    }
    if (trim.startsWith('>')) {
       if (currentBlock?.type !== 'blockquote') {
          finishBlock();
          currentBlock = { type: 'blockquote', content: trim.substring(1).trim() };
       } else {
          currentBlock.content += '\n' + trim.substring(1).trim();
       }
       continue;
    }

    // Lists (-, *)
    if (trim.match(/^[-*]\s/)) {
       const content = trim.replace(/^[-*]\s/, '');
       if (currentBlock?.type !== 'list') {
          finishBlock();
          currentBlock = { type: 'list', items: [content] };
       } else {
          currentBlock.items?.push(content);
       }
       continue;
    }

    // Q&A (Q: ... A: ...)
    if (trim.startsWith('Q: ')) {
      finishBlock();
      const question = trim.substring(3).trim();
      let answer = '';
      if (i + 1 < lines.length) {
        const nextLine = lines[i+1].trim();
        if (nextLine.startsWith('A: ')) {
          answer = nextLine.substring(3).trim();
          i++;
        }
      }
      blocks.push({ type: 'qa', question, answer });
      continue;
    }

    // Paragraphs
    if (trim === '') {
       finishBlock();
       continue;
    }

    if (currentBlock?.type === 'paragraph') {
       currentBlock.content += '\n' + trim;
    } else {
       finishBlock();
       currentBlock = { type: 'paragraph', content: trim };
    }
  }
  finishBlock();
  return blocks;
};

// --- Main Component ---

const LessonView: React.FC<LessonViewProps> = ({ topic, user, onBack, onStartPractice }) => {
  const [activeTab, setActiveTab] = useState<'read' | 'slides'>('slides');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [showControls, setShowControls] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  
  // Vocabulary State
  const [vocabMap, setVocabMap] = useState<Record<string, string>>({});
  
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const synth = window.speechSynthesis;

  // Fetch Vocabulary for automatic highlighting
  useEffect(() => {
    const fetchVocab = async () => {
       try {
          const q = collection(db, 'vocabulary');
          const snap = await getDocs(q);
          const map: Record<string, string> = {};
          
          snap.forEach(doc => {
             const data = doc.data();
             if (data.en && data.bn) {
                // Map lowercase english word to bangla meaning
                map[data.en.toLowerCase().trim()] = data.bn;
             }
          });
          
          setVocabMap(map);
       } catch (err: any) {
          console.error("Error fetching vocabulary for highlighting:", err.message || String(err));
       }
    };
    fetchVocab();
  }, []);

  // Split content into slides
  const slides = useMemo(() => {
     const rawBlocks = parseMarkdown(topic.content || '');
     const result: Block[][] = [];
     let currentSlideBlocks: Block[] = [];

     rawBlocks.forEach(block => {
        if (block.type === 'hr') {
           if (currentSlideBlocks.length > 0) result.push(currentSlideBlocks);
           currentSlideBlocks = [];
        } else {
           currentSlideBlocks.push(block);
        }
     });
     if (currentSlideBlocks.length > 0) result.push(currentSlideBlocks);
     if (result.length === 0 && rawBlocks.length > 0) result.push(rawBlocks);
     return result;
  }, [topic.content]);

  // Load Progress
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !topic.id) {
         setProgressLoaded(true);
         return;
      }
      try {
        const docRef = doc(db, 'users', user.uid, 'lessonProgress', topic.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.mode) setActiveTab(data.mode);
          if (data.slideIndex !== undefined) setCurrentSlide(data.slideIndex);
          if (data.fontSize) setFontSize(data.fontSize);
          
          if (data.mode === 'read' && data.scrollPosition && scrollContainerRef.current) {
            setTimeout(() => {
               if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = data.scrollPosition;
               }
            }, 100);
          }
        }
      } catch (error: any) {
        console.error("Error loading progress:", error.message || String(error));
      } finally {
        setProgressLoaded(true);
      }
    };
    loadProgress();
  }, [user, topic.id]);

  // Save Progress
  const saveProgress = useCallback(async () => {
    if (!user || !topic.id || !progressLoaded) return;
    try {
      setIsSaving(true);
      const scrollPos = scrollContainerRef.current ? scrollContainerRef.current.scrollTop : 0;
      await setDoc(doc(db, 'users', user.uid, 'lessonProgress', topic.id), {
        topicId: topic.id,
        mode: activeTab,
        slideIndex: currentSlide,
        scrollPosition: scrollPos,
        fontSize: fontSize,
        lastUpdated: Date.now()
      }, { merge: true });
      setTimeout(() => setIsSaving(false), 500);
    } catch (error: any) {
      console.error("Error saving progress:", error.message || String(error));
      setIsSaving(false);
    }
  }, [user, topic.id, activeTab, currentSlide, fontSize, progressLoaded]);

  // Auto-save interval
  useEffect(() => {
    if (!progressLoaded) return;
    const interval = setInterval(saveProgress, 30000);
    return () => clearInterval(interval);
  }, [saveProgress, progressLoaded]);

  // Save on state change
  useEffect(() => {
     if (progressLoaded) saveProgress();
  }, [currentSlide, activeTab, progressLoaded, saveProgress]);

  // MathJax Typeset
  useEffect(() => {
    if ((window as any).MathJax && contentRef.current) {
       setTimeout(() => {
         (window as any).MathJax.typesetPromise && (window as any).MathJax.typesetPromise([contentRef.current]);
       }, 50);
    }
  }, [currentSlide, activeTab, topic.content, vocabMap]); // Re-run when vocab map loads to update highlighting

  // Cleanup speech
  useEffect(() => {
    return () => synth.cancel();
  }, [synth]);

  const toggleSpeech = () => {
    if (isSpeaking) {
       synth.cancel();
       setIsSpeaking(false);
    } else {
       let textToRead = '';
       if (activeTab === 'slides' && slides.length > 0) {
          const blocks = slides[currentSlide];
          textToRead = blocks.map(b => b.content || b.question || b.items?.join('. ')).join('. ');
       } else {
          textToRead = topic.content || '';
       }
       // Simple strip of markdown chars for cleaner speech
       textToRead = textToRead.replace(/[#*`_]/g, '');
       const utterance = new SpeechSynthesisUtterance(textToRead);
       utterance.onend = () => setIsSpeaking(false);
       synth.speak(utterance);
       setIsSpeaking(true);
    }
  };

  const renderBlock = (block: Block, idx: number) => {
    switch (block.type) {
       case 'header':
          const level = Math.min(block.level || 1, 3);
          // Use dynamic keyof intrinsic elements to avoid TS errors in strict mode if necessary
          const HTag = `h${level}` as React.ElementType;
          const hSize = level === 1 ? 'text-2xl text-blue-400' : level === 2 ? 'text-xl text-green-400' : 'text-lg text-yellow-400';
          return (
             <HTag key={idx} className={`${hSize} font-bold mb-4 mt-6 border-b border-white/5 pb-2`}>
                {parseInline(block.content || '', vocabMap)}
             </HTag>
          );
       case 'paragraph':
          return (
             <p key={idx} className="mb-4 leading-relaxed text-gray-300">
                {parseInline(block.content || '', vocabMap)}
             </p>
          );
       case 'math':
          return (
             <div key={idx} className="my-6 p-4 bg-white/5 rounded-xl border border-white/5 text-center overflow-x-auto text-lg text-white font-serif">
                {`$$${block.content}$$`}
             </div>
          );
       case 'blockquote':
          return (
             <div key={idx} className="my-6 pl-4 border-l-4 border-yellow-500 bg-yellow-500/5 py-2 pr-4 rounded-r-lg">
                <p className="text-yellow-200/90 italic text-sm">{parseInline(block.content || '', vocabMap)}</p>
             </div>
          );
       case 'list':
          return (
             <ul key={idx} className="mb-4 space-y-2 list-none pl-2">
                {block.items?.map((item, i) => (
                   <li key={i} className="flex items-start gap-2 text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                      <span>{parseInline(item, vocabMap)}</span>
                   </li>
                ))}
             </ul>
          );
       case 'table':
          return (
             <div key={idx} className="my-6 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm text-left">
                   {block.headers && (
                      <thead className="bg-white/10 text-white uppercase text-xs font-bold">
                         <tr>
                            {block.headers.map((h, i) => (
                               <th key={i} className="px-6 py-3 border-b border-white/10">{parseInline(h, vocabMap)}</th>
                            ))}
                         </tr>
                      </thead>
                   )}
                   <tbody>
                      {block.rows?.map((row, rIdx) => (
                         <tr key={rIdx} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                            {row.map((cell, cIdx) => (
                               <td key={cIdx} className="px-6 py-4 text-gray-300 border-r border-white/5 last:border-0">
                                  {parseInline(cell, vocabMap)}
                               </td>
                            ))}
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          );
       case 'qa':
          return <QAItem key={idx} question={block.question || ''} answer={block.answer || ''} vocabMap={vocabMap} />;
       default:
          return null;
    }
  };

  const currentBlocks = activeTab === 'slides' ? (slides[currentSlide] || []) : parseMarkdown(topic.content || '');

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] pb-4 animate-in fade-in duration-300">
       
       {/* Top Toolbar */}
       <div className="flex items-center justify-between mb-4 mt-2 px-1">
          <div className="flex items-center gap-3">
             <button onClick={() => { saveProgress(); onBack(); }} className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2">
                <ArrowLeft className="w-6 h-6 text-gray-400 hover:text-white" />
             </button>
             <h2 className="text-lg font-bold text-white truncate max-w-[150px] sm:max-w-xs">{topic.title}</h2>
          </div>
          
          <div className="flex items-center gap-2">
             <div className={`text-[10px] flex items-center gap-1 transition-opacity duration-300 ${isSaving ? 'opacity-100 text-green-400' : 'opacity-0'}`}>
                <Save className="w-3 h-3" />
                <span>Saved</span>
             </div>

             <div className="flex items-center gap-1 bg-app-card p-1 rounded-full border border-white/10">
                <button 
                   onClick={() => setActiveTab('slides')}
                   className={`p-2 rounded-full transition-all ${activeTab === 'slides' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                   title="Slides Mode"
                >
                   <Layers className="w-4 h-4" />
                </button>
                <button 
                   onClick={() => setActiveTab('read')}
                   className={`p-2 rounded-full transition-all ${activeTab === 'read' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                   title="Read Mode"
                >
                   <AlignLeft className="w-4 h-4" />
                </button>
             </div>
          </div>
       </div>

       {/* Appearance Controls */}
       <div className="mb-4 flex items-center justify-between">
          <button 
            onClick={() => setShowControls(!showControls)}
            className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
          >
             <Type className="w-3 h-3" /> Appearance
          </button>
          
          <button 
            onClick={toggleSpeech}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isSpeaking ? 'bg-green-500/20 text-green-400 animate-pulse border border-green-500/30' : 'bg-white/5 text-gray-400 border border-white/5'}`}
          >
             {isSpeaking ? <Pause className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
             {isSpeaking ? 'Listening...' : 'Read Aloud'}
          </button>
       </div>

       {showControls && (
          <div className="bg-app-card p-4 rounded-xl border border-white/10 mb-4 animate-in slide-in-from-top-2">
             <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Text Size</span>
                <div className="flex items-center gap-3">
                   <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="p-1 hover:bg-white/10 rounded"><Minimize2 className="w-4 h-4 text-gray-400" /></button>
                   <span className="text-sm font-mono text-white w-6 text-center">{fontSize}</span>
                   <button onClick={() => setFontSize(Math.min(24, fontSize + 2))} className="p-1 hover:bg-white/10 rounded"><Maximize2 className="w-4 h-4 text-gray-400" /></button>
                </div>
             </div>
          </div>
       )}

       {/* Content Container */}
       <div className="flex-1 overflow-hidden relative rounded-2xl bg-app-card border border-white/5 shadow-2xl flex flex-col">
          {activeTab === 'slides' && slides.length > 1 && (
             <div className="w-full h-1 bg-gray-800">
                <div 
                   className="h-full bg-blue-500 transition-all duration-300" 
                   style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                ></div>
             </div>
          )}

          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-hide"
            style={{ fontSize: `${fontSize}px` }}
          >
             <div ref={contentRef} className="max-w-2xl mx-auto">
                {currentBlocks.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50 py-20">
                      <BookOpen className="w-12 h-12 mb-2" />
                      <p className="text-sm">Empty Content</p>
                   </div>
                ) : (
                   currentBlocks.map((block, i) => renderBlock(block, i))
                )}
             </div>
          </div>

          {activeTab === 'slides' && slides.length > 1 && (
             <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-sm flex items-center justify-between">
                <button 
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                   <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                
                <span className="text-sm font-mono text-gray-400">
                   {currentSlide + 1} <span className="text-gray-600">/</span> {slides.length}
                </span>

                <button 
                  onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                  disabled={currentSlide === slides.length - 1}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                   <ChevronRight className="w-5 h-5 text-white" />
                </button>
             </div>
          )}
       </div>

       <button 
         onClick={onStartPractice}
         className="w-full mt-4 py-4 rounded-xl bg-green-600 text-white font-bold text-lg hover:bg-green-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 active:scale-[0.98]"
       >
          <PlayCircle className="w-5 h-5" />
          Start Practice
       </button>
    </div>
  );
};

export default LessonView;