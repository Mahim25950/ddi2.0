import { 
  Store, 
  BookOpen, 
  Bookmark, 
  Zap, 
  PenTool, 
  Calendar, 
  SpellCheck, 
  Wrench, 
  ListTodo, 
  Home, 
  Trophy, 
  History, 
  Menu,
  Sigma,
  PieChart,
  Library
} from 'lucide-react';
import { MenuItem, NavItem } from './types';

export const GRID_ITEMS: MenuItem[] = [
  {
    id: 'lesson',
    title: 'লেসন',
    icon: Library,
    color: 'text-blue-500'
  },
  {
    id: 'question-bank',
    title: 'প্রশ্ন ব্যাংক',
    icon: BookOpen,
    color: 'text-green-500'
  },
  {
    id: 'quick-revision',
    title: 'দ্রুত রিভিশন',
    icon: Bookmark,
    color: 'text-blue-500'
  },
  {
    id: 'practice',
    title: 'প্র্যাকটিস',
    icon: Zap,
    color: 'text-yellow-500'
  },
  {
    id: 'formula',
    title: 'সূত্র / Formula',
    icon: Sigma,
    color: 'text-pink-500'
  },
  {
    id: 'mock-exam',
    title: 'মক পরীক্ষা',
    icon: PenTool,
    color: 'text-red-500'
  },
  {
    id: 'routine',
    title: 'রুটিন',
    icon: Calendar,
    color: 'text-blue-400'
  },
  {
    id: 'vocabulary',
    title: 'শব্দভাণ্ডার',
    icon: SpellCheck,
    color: 'text-purple-500'
  },
  {
    id: 'exam-settings',
    title: 'পরীক্ষা',
    icon: Wrench,
    color: 'text-gray-400'
  },
  {
    id: 'study-planner',
    title: 'স্টাডি প্ল্যানার',
    icon: ListTodo,
    color: 'text-teal-500'
  }
];

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'হোম',
    icon: Home,
    isActive: true
  },
  {
    id: 'progress',
    label: 'প্রোগ্রেস',
    icon: PieChart,
    isActive: false
  },
  {
    id: 'leaderboard',
    label: 'লিডারবোর্ড',
    icon: Trophy,
    isActive: false
  },
  {
    id: 'others',
    label: 'মেনু',
    icon: Menu,
    isActive: false
  }
];