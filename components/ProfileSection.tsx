import React, { useState } from 'react';
import { User, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { 
  ArrowLeft, User as UserIcon, Mail, Shield, LogOut, 
  GraduationCap, Edit2, Camera, Save, X, KeyRound, 
  Bell, Volume2, HelpCircle, ChevronRight, Calendar,
  CheckCircle, AlertCircle, FileText
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface ProfileSectionProps {
  user: User;
  onBack: () => void;
  userClass: string;
  onClassChange: (newClass: string) => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ user, onBack, userClass, onClassChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user.displayName || '');
  const [newPhotoURL, setNewPhotoURL] = useState(user.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Settings State (Persisted in LocalStorage)
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(() => {
    return localStorage.getItem('app_sound') !== 'false'; // Default true
  });

  const classes = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error: any) {
      console.error("Error signing out: ", error.message || "Unknown error");
    }
  };

  const handleUpdateProfile = async () => {
    if (!newName.trim()) {
      setMsg({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }
    
    setLoading(true);
    setMsg(null);

    try {
      await updateProfile(user, {
        displayName: newName,
        photoURL: newPhotoURL || null
      });

      // Also update Firestore to keep Leaderboard synced
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
         displayName: newName,
         photoURL: newPhotoURL || null
      }, { merge: true });

      setMsg({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Profile Update Error:", error.message);
      setMsg({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    if (!window.confirm(`Send password reset email to ${user.email}?`)) return;

    try {
      await sendPasswordResetEmail(auth, user.email);
      setMsg({ type: 'success', text: 'Password reset email sent! Check your inbox.' });
    } catch (error: any) {
      console.error("Reset Password Error:", error.message);
      setMsg({ type: 'error', text: error.message || 'Failed to send reset email.' });
    }
  };

  const toggleSound = () => {
    const newState = !sound;
    setSound(newState);
    localStorage.setItem('app_sound', String(newState));
  };

  // Format creation time
  const joinDate = user.metadata.creationTime 
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

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
        <h2 className="text-2xl font-bold text-white tracking-tight">প্রোফাইল</h2>
      </div>

      {/* Feedback Message */}
      {msg && (
        <div className={`mb-6 p-3 rounded-xl border flex items-start gap-2 ${msg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p className="text-sm">{msg.text}</p>
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-app-card rounded-3xl p-6 border border-white/5 flex flex-col items-center text-center mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-green-500/10 to-transparent"></div>
        
        <div className="relative mb-4 group">
          <div className="w-24 h-24 rounded-full bg-[#121212] border-4 border-app-card ring-2 ring-green-500/30 flex items-center justify-center overflow-hidden shadow-xl">
            {newPhotoURL ? (
              <img src={newPhotoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-green-500" />
            )}
          </div>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute bottom-0 right-0 p-2 bg-green-600 rounded-full text-white shadow-lg hover:bg-green-500 transition-transform hover:scale-110"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="w-full space-y-3 animate-in fade-in zoom-in duration-200">
            <div className="relative">
               <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
               <input 
                 type="text" 
                 value={newName} 
                 onChange={(e) => setNewName(e.target.value)}
                 placeholder="Display Name"
                 className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:border-green-500 outline-none"
               />
            </div>
            <div className="relative">
               <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
               <input 
                 type="text" 
                 value={newPhotoURL} 
                 onChange={(e) => setNewPhotoURL(e.target.value)}
                 placeholder="Photo URL (https://...)"
                 className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:border-green-500 outline-none"
               />
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => { setIsEditing(false); setNewName(user.displayName || ''); setNewPhotoURL(user.photoURL || ''); setMsg(null); }}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateProfile}
                disabled={loading}
                className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-xs font-bold text-white flex items-center justify-center gap-2"
              >
                {loading ? 'Saving...' : <><Save className="w-3 h-3" /> Save Changes</>}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-white mb-1">{user.displayName || 'No Name'}</h3>
            <p className="text-gray-400 text-sm mb-3">{user.email}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500 bg-white/5 px-4 py-1.5 rounded-full">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Joined {joinDate}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        
        {/* Academic Info */}
        <section>
           <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3 ml-1">Academic</h4>
           <div className="bg-app-card rounded-xl border border-white/5 overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-white/5">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><GraduationCap className="w-5 h-5" /></div>
                    <div>
                       <p className="text-sm font-medium text-white">Current Class</p>
                       <p className="text-xs text-gray-500">Select your study level</p>
                    </div>
                 </div>
                 <select
                    value={userClass}
                    onChange={(e) => onClassChange(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-green-500"
                  >
                    {classes.map((c) => (
                      <option key={c} value={c} className="bg-gray-900">{c}</option>
                    ))}
                  </select>
              </div>
           </div>
        </section>

        {/* Account Settings */}
        <section>
           <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3 ml-1">Account</h4>
           <div className="bg-app-card rounded-xl border border-white/5 overflow-hidden">
              <button 
                 onClick={handlePasswordReset}
                 className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
              >
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><KeyRound className="w-5 h-5" /></div>
                    <div>
                       <p className="text-sm font-medium text-white">Change Password</p>
                       <p className="text-xs text-gray-500">Receive a reset email</p>
                    </div>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>

              <div className="p-4 flex items-center justify-between border-b border-white/5 last:border-0">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Mail className="w-5 h-5" /></div>
                    <div>
                       <p className="text-sm font-medium text-white">Email Address</p>
                       <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                 </div>
                 <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[10px] text-green-400">Verified</div>
              </div>
           </div>
        </section>

        {/* App Preferences */}
        <section>
           <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3 ml-1">Preferences</h4>
           <div className="bg-app-card rounded-xl border border-white/5 overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-white/5 last:border-0">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Bell className="w-5 h-5" /></div>
                    <span className="text-sm font-medium text-white">Push Notifications</span>
                 </div>
                 <button 
                   onClick={() => setNotifications(!notifications)}
                   className={`w-10 h-5 rounded-full relative transition-colors ${notifications ? 'bg-green-600' : 'bg-gray-700'}`}
                 >
                   <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${notifications ? 'left-6' : 'left-1'}`}></div>
                 </button>
              </div>
              
              <div className="p-4 flex items-center justify-between border-b border-white/5 last:border-0">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500"><Volume2 className="w-5 h-5" /></div>
                    <span className="text-sm font-medium text-white">Sound Effects</span>
                 </div>
                 <button 
                   onClick={toggleSound}
                   className={`w-10 h-5 rounded-full relative transition-colors ${sound ? 'bg-green-600' : 'bg-gray-700'}`}
                 >
                   <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${sound ? 'left-6' : 'left-1'}`}></div>
                 </button>
              </div>
           </div>
        </section>

        {/* Support & Legal */}
        <section>
           <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3 ml-1">Support</h4>
           <div className="bg-app-card rounded-xl border border-white/5 overflow-hidden">
              <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500"><HelpCircle className="w-5 h-5" /></div>
                    <span className="text-sm font-medium text-white">Help Center</span>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
              <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-500/10 rounded-lg text-gray-400"><FileText className="w-5 h-5" /></div>
                    <span className="text-sm font-medium text-white">Terms & Privacy</span>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
           </div>
        </section>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <LogOut className="w-5 h-5" />
          লগ আউট করুন
        </button>

        <div className="text-center pt-4 pb-8">
           <p className="text-[10px] text-gray-600">DDI Learning App v1.2.0</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;