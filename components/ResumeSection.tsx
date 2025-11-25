import React from 'react';
import { RotateCw } from 'lucide-react';

const ResumeSection: React.FC = () => {
  return (
    <div className="mt-6 mb-24 mx-4">
      <div className="bg-app-card rounded-2xl p-5 border border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-bold text-gray-100">
            যেখান থেকে শেষ করেছিলেন
          </h2>
          <RotateCw className="w-4 h-4 text-blue-500 cursor-pointer hover:rotate-180 transition-transform duration-500" />
        </div>
        
        <p className="text-gray-500 text-xs mb-8">
          আপনার সর্বশেষ সেশনটি আবার শুরু করুন
        </p>

        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">
            কোনো চলমান সেশন নেই।
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResumeSection;