import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: name
        });
      }
    } catch (err: any) {
      console.error(err.message || String(err));
      let msg = "একটি ত্রুটি হয়েছে। আবার চেষ্টা করুন।";
      if (err.code === 'auth/invalid-email') msg = "ইমেইল ঠিকানাটি সঠিক নয়";
      if (err.code === 'auth/user-disabled') msg = "ব্যবহারকারী অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে";
      if (err.code === 'auth/user-not-found') msg = "এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি";
      if (err.code === 'auth/wrong-password') msg = "ভুল পাসওয়ার্ড";
      if (err.code === 'auth/invalid-credential') msg = "ইমেইল বা পাসওয়ার্ড সঠিক নয়";
      if (err.code === 'auth/email-already-in-use') msg = "এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হচ্ছে";
      if (err.code === 'auth/weak-password') msg = "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1E1E1E] p-8 rounded-3xl border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
             <span className="text-green-500">ddi</span>
             <span className="text-white text-xl ml-1">অ্যাপ</span>
          </h1>
          <p className="text-gray-400 text-sm">
            {isLogin ? 'আপনার অ্যাকাউন্টে লগ ইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="আপনার নাম"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-green-500 transition-colors placeholder:text-gray-600"
                required
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="email"
              placeholder="ইমেইল"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-green-500 transition-colors placeholder:text-gray-600"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="password"
              placeholder="পাসওয়ার্ড"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-green-500 transition-colors placeholder:text-gray-600"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'লগ ইন' : 'সাইন আপ'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            {isLogin ? 'অ্যাকাউন্ট নেই?' : 'ইতিমধ্যে অ্যাকাউন্ট আছে?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-green-500 font-semibold ml-1 hover:underline focus:outline-none"
            >
              {isLogin ? 'সাইন আপ করুন' : 'লগ ইন করুন'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;