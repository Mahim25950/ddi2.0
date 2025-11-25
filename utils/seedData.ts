import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const seedDatabase = async () => {
  // Default seeding for "Class 8" as per original requirement, can be expanded if needed
  const classLevel = "Class 8"; 

  const subjects = [
    { title: "গণিত (Math)", chapterCount: 10, progress: 25, color: "text-blue-500" },
    { title: "পদার্থবিজ্ঞান (Physics)", chapterCount: 8, progress: 40, color: "text-purple-500" },
    { title: "রসায়ন (Chemistry)", chapterCount: 7, progress: 10, color: "text-red-500" },
    { title: "জীববিজ্ঞান (Biology)", chapterCount: 9, progress: 0, color: "text-green-500" },
    { title: "বাংলা (Bangla)", chapterCount: 12, progress: 5, color: "text-pink-500" },
    { title: "ইংরেজি (English)", chapterCount: 15, progress: 30, color: "text-yellow-500" },
    { title: "তথ্য ও যোগাযোগ প্রযুক্তি (ICT)", chapterCount: 5, progress: 0, color: "text-cyan-500" },
    { title: "বাংলাদেশ ও বিশ্বপরিচয় (BGS)", chapterCount: 11, progress: 0, color: "text-orange-500" },
  ];

  // Data mapping for chapters
  const chapterData: Record<string, string[]> = {
    "গণিত (Math)": ["বাস্তব সংখ্যা", "সেট ও ফাংশন", "বীজগাণিতিক রাশি", "সূচক ও লগারিদম", "এক চলক বিশিষ্ট সমীকরণ", "রেখা, কোণ ও ত্রিভুজ", "ব্যবহারিক জ্যামিতি", "বৃত্ত", "ত্রিকোণমিতিক অনুপাত", "দূরত্ব ও উচ্চতা"],
    "পদার্থবিজ্ঞান (Physics)": ["ভৌত রাশি এবং পরিমাপ", "গতি", "বল", "কাজ, ক্ষমতা ও শক্তি", "পদার্থের অবস্থা ও চাপ", "বস্তুর উপর তাপের প্রভাব", "শব্দ ও তরঙ্গ", "আলোর প্রতিফলন"],
    "রসায়ন (Chemistry)": ["রসায়নের ধারণা", "পদার্থের গঠন", "পর্যায় সারণি", "রাসায়নিক বন্ধন", "মোল ও রাসায়নিক গণনা", "এসিড, ক্ষার ও সমতা", "জীবাশ্ম জ্বালানি"],
    "জীববিজ্ঞান (Biology)": ["জীবন পাঠ", "জীবকোষ ও টিস্যু", "কোষ বিভাজন", "জীবনীশক্তি", "খাদ্য, পুষ্টি এবং পরিপাক", "জীবে পরিবহন", "গ্যাসীয় বিনিময়", "রেচন প্রক্রিয়া"],
    "বাংলা (Bangla)": ["গদ্য: শুভা", "গদ্য: বই পড়া", "গদ্য: অভাগীর স্বর্গ", "কবিতা: বঙ্গবাণী", "কবিতা: কপোতাক্ষ নদ", "কবিতা: জীবন-সঙ্গীত", "উপন্যাস: কাকতাড়ুয়া", "নাটক: বহিপীর"],
    "ইংরেজি (English)": ["Unit 1: Father of the Nation", "Unit 2: Pastimes", "Unit 3: Events and Festivals", "Unit 4: Are We Aware?", "Unit 5: Nature and Environment", "Grammar: Parts of Speech", "Grammar: Tenses", "Grammar: Voice Change"],
  };

  try {
    // Use batch for better performance, though Subjects are added individually to get IDs
    let subjectsAdded = 0;
    let chaptersAdded = 0;

    for (const sub of subjects) {
      const subRef = await addDoc(collection(db, "subjects"), {
        title: sub.title,
        chapterCount: sub.chapterCount,
        progress: sub.progress,
        classLevel: classLevel // Added classLevel
      });
      subjectsAdded++;

      const chapters = chapterData[sub.title] || ["Introduction", "Chapter 1", "Chapter 2"];
      
      const batch = writeBatch(db);
      chapters.forEach((chapTitle, index) => {
        const chapRef = doc(collection(db, "chapters"));
        batch.set(chapRef, {
          title: chapTitle,
          subjectId: subRef.id,
          isLocked: index > 2, // Unlock first 3 chapters, lock the rest
          duration: "45 min"
        });
        chaptersAdded++;
      });
      await batch.commit();
    }
    
    alert(`Database Seeded for ${classLevel}!\nAdded ${subjectsAdded} subjects and ${chaptersAdded} chapters.`);
  } catch (error) {
    console.error("Error seeding database:", (error as any).message);
    alert("Error seeding database. Check console for details.");
  }
};