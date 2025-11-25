import React, { useEffect, useState } from 'react';
import { ArrowLeft, Tag, ChevronRight, BookOpen } from 'lucide-react';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { Chapter, Topic } from '../types';

interface TopicSelectionProps {
  chapter: Chapter;
  onBack: () => void;
  onSelectTopic: (topic: Topic) => void;
}

interface TopicWithCount extends Topic {
  questionCount?: number;
}

const TopicSelection: React.FC<TopicSelectionProps> = ({ chapter, onBack, onSelectTopic }) => {
  const [topics, setTopics] = useState<TopicWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'topics'), 
          where('chapterId', '==', chapter.id)
        );
        
        const querySnapshot = await getDocs(q);
        
        // Fetch topics and their question counts
        const fetchedTopics = await Promise.all(querySnapshot.docs.map(async (doc) => {
          const tData = doc.data();
          const topicId = doc.id;
          
          let count = 0;
          try {
             const qCount = query(collection(db, 'questions'), where('topicId', '==', topicId));
             const snap = await getCountFromServer(qCount);
             count = snap.data().count;
          } catch (e: any) {
             console.log("Count error", e.message || String(e));
          }

          return {
            id: topicId,
            ...tData,
            questionCount: count
          } as TopicWithCount;
        }));
        
        setTopics(fetchedTopics);
      } catch (error: any) {
        console.error("Error fetching topics:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [chapter.id]);

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
            <BookOpen className="w-5 h-5 text-blue-500" />
            লেসন টপিক
          </h2>
          <p className="text-gray-400 text-xs">{chapter.title}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-app-card rounded-xl p-4 h-16 animate-pulse border border-white/5"></div>
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-10 bg-app-card rounded-xl border border-white/5">
          <Tag className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">এই অধ্যায়ে কোনো টপিক নেই।</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic, index) => (
            <div 
              key={topic.id}
              onClick={() => onSelectTopic(topic)}
              className="bg-app-card rounded-xl p-4 flex items-center justify-between border border-white/5 hover:bg-[#252525] cursor-pointer active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-gray-100 font-medium text-sm">{topic.title}</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">{topic.questionCount || 0} Questions</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopicSelection;