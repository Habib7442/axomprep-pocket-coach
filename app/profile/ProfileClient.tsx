'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateProfile, signOut } from './actions'
import { 
  ArrowLeft, Save, User, Briefcase, GraduationCap, Globe, 
  Mail, Copy, LogOut, CheckCircle2, Loader2, Coins
} from 'lucide-react'
import { toast } from 'sonner'

const LANGUAGES = [
  { value: 'assamese', label: 'অসমীয়া (Assamese)' },
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'हिन्दी (Hindi)' },
  { value: 'bengali', label: 'বাংলা (Bengali)' },
  { value: 'bodo', label: 'बड़ो (Bodo)' },
]

export default function ProfileClient({ profile }: { profile: any }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [fullName, setFullName] = useState(profile.full_name || '')
  const [profession, setProfession] = useState(profile.profession || '')
  const [studentClass, setStudentClass] = useState(profile.student_class || '')
  const [nativeLanguage, setNativeLanguage] = useState(profile.native_language || '')

  const isStudent = profession === 'Student'

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({
        full_name: fullName,
        profession,
        student_class: isStudent ? studentClass : '',
        native_language: nativeLanguage,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      toast.success('Profile updated!')
      router.refresh()
    } catch (err) {
      toast.error('Failed to update profile')
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-orange-100/30 via-blue-50/20 to-transparent blur-[120px] -z-10 rounded-full" />

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link 
            href="/dashboard"
            className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Profile Settings</h1>
            <p className="text-zinc-400 text-sm font-medium">Manage your account details</p>
          </div>
        </div>

        {/* Avatar & Stats */}
        <div className="flex items-center gap-6 mb-10 p-6 bg-zinc-50/80 border border-zinc-100 rounded-3xl">
          <div className="w-20 h-20 rounded-2xl bg-black flex items-center justify-center overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-black">{fullName?.charAt(0)?.toUpperCase() || 'U'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-black truncate">{fullName || 'Learner'}</p>
            <p className="text-zinc-400 text-sm font-medium truncate flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {profile.email}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1 text-xs font-black bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg border border-orange-100">
                <Coins className="w-3 h-3" /> {profile.credits} Credits
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-black bg-zinc-100 text-zinc-500 px-2.5 py-1 rounded-lg">
                {profession || 'Not Set'}
              </span>
            </div>
          </div>
        </div>

        {/* Referral Code Card */}
        <div className="mb-10 p-5 bg-gradient-to-r from-zinc-50 to-orange-50/50 border border-zinc-100 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Your Referral Code</p>
              <p className="text-xl font-black tracking-widest italic">{profile.referral_code}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile.referral_code || '')
                toast.success('Referral code copied!')
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Personal Information</p>

          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 flex items-center gap-1.5 pl-1">
              <User className="w-3.5 h-3.5" /> Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border-2 border-transparent focus:border-black outline-none transition-all font-medium placeholder:text-zinc-300 focus:ring-4 focus:ring-black/5"
            />
          </div>

          {/* Profession */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 flex items-center gap-1.5 pl-1">
              <Briefcase className="w-3.5 h-3.5" /> Profession
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setProfession('Student')}
                className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${
                  isStudent
                    ? 'bg-black text-white shadow-lg shadow-black/10'
                    : 'bg-zinc-50 text-zinc-500 border border-zinc-100 hover:bg-zinc-100'
                }`}
              >
                <GraduationCap className="w-4 h-4" /> Student
              </button>
              <button
                onClick={() => setProfession('')}
                className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${
                  !isStudent && profession !== ''
                    ? 'bg-black text-white shadow-lg shadow-black/10'
                    : profession === '' 
                      ? 'bg-zinc-50 text-zinc-500 border border-zinc-100 hover:bg-zinc-100'
                      : 'bg-zinc-50 text-zinc-500 border border-zinc-100 hover:bg-zinc-100'
                }`}
              >
                <Briefcase className="w-4 h-4" /> Working
              </button>
            </div>

            {isStudent ? (
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Class</label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setStudentClass(cls)}
                      className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                        studentClass === cls
                          ? 'bg-black text-white scale-105 shadow-md'
                          : 'bg-zinc-50 text-zinc-500 border border-zinc-100 hover:bg-zinc-100'
                      }`}
                    >
                      {cls.replace('Class ', '')}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['Graduation', 'Post Graduation'].map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setStudentClass(cls)}
                      className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                        studentClass === cls
                          ? 'bg-black text-white scale-105 shadow-md'
                          : 'bg-zinc-50 text-zinc-500 border border-zinc-100 hover:bg-zinc-100'
                      }`}
                    >
                      🎓 {cls}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              !isStudent && (
                <input
                  type="text"
                  value={profession === 'Student' ? '' : profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="e.g. Software Engineer, Teacher..."
                  className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border-2 border-transparent focus:border-black outline-none transition-all font-medium placeholder:text-zinc-300 focus:ring-4 focus:ring-black/5 mt-2"
                />
              )
            )}
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 flex items-center gap-1.5 pl-1">
              <Globe className="w-3.5 h-3.5" /> Preferred Language
            </label>
            <div className="space-y-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setNativeLanguage(lang.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left text-sm ${
                    nativeLanguage === lang.value
                      ? 'border-black bg-zinc-50 font-bold'
                      : 'border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 font-medium text-zinc-500'
                  }`}
                >
                  <span className="flex-1">{lang.label}</span>
                  {nativeLanguage === lang.value && (
                    <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-black text-white font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <>
                <CheckCircle2 className="w-5 h-5" /> Saved!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" /> Save Changes
              </>
            )}
          </button>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-red-100 text-red-500 font-bold hover:bg-red-50 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <div className="h-12" />
      </div>
    </div>
  )
}
