'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { completeOnboarding } from '@/app/login/actions'
import { ArrowRight, ArrowLeft, GraduationCap, Briefcase, Sparkles } from 'lucide-react'

const STEPS = ['profession', 'details', 'language'] as const
type Step = typeof STEPS[number]

const LANGUAGES = [
  { value: 'assamese', label: 'অসমীয়া (Assamese)', emoji: '🇮🇳' },
  { value: 'english', label: 'English', emoji: '🌐' },
  { value: 'hindi', label: 'हिन्दी (Hindi)', emoji: '🇮🇳' },
  { value: 'bengali', label: 'বাংলা (Bengali)', emoji: '🇮🇳' },
  { value: 'bodo', label: 'बड़ो (Bodo)', emoji: '🇮🇳' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [profession, setProfession] = useState<'student' | 'working' | ''>('')
  const [studentClass, setStudentClass] = useState('')
  const [workingProfession, setWorkingProfession] = useState('')
  const [nativeLanguage, setNativeLanguage] = useState('')

  const step: Step = STEPS[currentStep]

  const canNext = () => {
    if (step === 'profession') return profession !== ''
    if (step === 'details') {
      if (profession === 'student') return studentClass !== ''
      if (profession === 'working') return workingProfession.trim() !== ''
    }
    if (step === 'language') return nativeLanguage !== ''
    return false
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      await completeOnboarding({
        profession: profession === 'student' ? 'Student' : workingProfession,
        student_class: profession === 'student' ? studentClass : undefined,
        native_language: nativeLanguage,
      })
      // Success fallback if server redirect doesn't trigger
      router.push('/dashboard')
    } catch (err: any) {
      if (err?.message === 'NEXT_REDIRECT' || err?.digest?.includes('NEXT_REDIRECT')) {
        throw err;
      }
      console.error('Onboarding error:', err)
      toast.error('Failed to complete onboarding. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const progressWidth = ((currentStep + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-white text-black font-sans flex items-center justify-center p-6 relative overflow-hidden">
      {/* Soft background glows */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-orange-100/40 via-blue-50/20 to-transparent blur-[120px] -z-10 rounded-full" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-emerald-50/30 blur-[150px] rounded-full -z-10" />

      <div className="w-full max-w-lg space-y-8">
        {/* Progress bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span className="text-black">{Math.round(progressWidth)}%</span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-200 via-blue-200 to-emerald-200 rounded-[2.6rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />

          <div className="relative bg-white border border-zinc-100 rounded-[2.5rem] p-8 md:p-10 shadow-2xl min-h-[400px] flex flex-col">

            {/* Step 1: Profession */}
            {step === 'profession' && (
              <div className="flex-1 flex flex-col justify-center space-y-8">
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-black tracking-tight">What do you do? 👋</h1>
                  <p className="text-zinc-400 font-medium text-sm">This helps us personalize your coaching experience</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setProfession('student')}
                    className={`group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 ${
                      profession === 'student'
                        ? 'border-black bg-zinc-50 scale-[1.02] shadow-lg shadow-black/5'
                        : 'border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                      profession === 'student' ? 'bg-black' : 'bg-zinc-100'
                    }`}>
                      <GraduationCap className={`w-7 h-7 ${profession === 'student' ? 'text-white' : 'text-zinc-400'}`} />
                    </div>
                    <span className="font-bold text-sm">Student</span>
                  </button>

                  <button
                    onClick={() => setProfession('working')}
                    className={`group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 ${
                      profession === 'working'
                        ? 'border-black bg-zinc-50 scale-[1.02] shadow-lg shadow-black/5'
                        : 'border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                      profession === 'working' ? 'bg-black' : 'bg-zinc-100'
                    }`}>
                      <Briefcase className={`w-7 h-7 ${profession === 'working' ? 'text-white' : 'text-zinc-400'}`} />
                    </div>
                    <span className="font-bold text-sm">Working Professional</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 'details' && (
              <div className="flex-1 flex flex-col justify-center space-y-8">
                {profession === 'student' ? (
                  <>
                    <div className="space-y-2 text-center">
                      <h1 className="text-3xl font-black tracking-tight">Which class? 📚</h1>
                      <p className="text-zinc-400 font-medium text-sm">Select your current class or education level</p>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((cls) => (
                          <button
                            key={cls}
                            onClick={() => setStudentClass(`Class ${cls}`)}
                            className={`py-3 rounded-xl font-bold text-sm transition-all ${
                              studentClass === `Class ${cls}`
                                ? 'bg-black text-white scale-105 shadow-lg shadow-black/10'
                                : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-100'
                            }`}
                          >
                            {cls}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => setStudentClass('Graduation')}
                          className={`py-3 rounded-xl font-bold text-sm transition-all ${
                            studentClass === 'Graduation'
                              ? 'bg-black text-white scale-105 shadow-lg shadow-black/10'
                              : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-100'
                          }`}
                        >
                          🎓 Graduation
                        </button>
                        <button
                          onClick={() => setStudentClass('Post Graduation')}
                          className={`py-3 rounded-xl font-bold text-sm transition-all ${
                            studentClass === 'Post Graduation'
                              ? 'bg-black text-white scale-105 shadow-lg shadow-black/10'
                              : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-100'
                          }`}
                        >
                          🎓 Post Graduation
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 text-center">
                      <h1 className="text-3xl font-black tracking-tight">Your Profession 💼</h1>
                      <p className="text-zinc-400 font-medium text-sm">Tell us what you do so we can tailor your experience</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Job Title / Profession</label>
                      <input
                        type="text"
                        value={workingProfession}
                        onChange={(e) => setWorkingProfession(e.target.value)}
                        placeholder="e.g. Software Engineer, Teacher, Doctor..."
                        className="w-full px-5 py-4 rounded-2xl bg-zinc-50 border-2 border-transparent focus:border-black outline-none transition-all font-medium placeholder:text-zinc-300 focus:ring-4 focus:ring-black/5"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Language */}
            {step === 'language' && (
              <div className="flex-1 flex flex-col justify-center space-y-8">
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-black tracking-tight">Preferred Language 🗣️</h1>
                  <p className="text-zinc-400 font-medium text-sm">Choose the language you&apos;re most comfortable in</p>
                </div>

                <div className="space-y-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setNativeLanguage(lang.value)}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                        nativeLanguage === lang.value
                          ? 'border-black bg-zinc-50 scale-[1.01] shadow-md shadow-black/5'
                          : 'border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <span className="text-2xl">{lang.emoji}</span>
                      <span className="font-bold text-sm flex-1">{lang.label}</span>
                      {nativeLanguage === lang.value && (
                        <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-6 mt-auto">
              {currentStep > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-zinc-400 hover:text-black hover:bg-zinc-50 transition-all font-bold text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!canNext()}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white font-black text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:hover:scale-100 shadow-xl shadow-black/10"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={!canNext() || loading}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-black text-white font-black text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:hover:scale-100 shadow-xl shadow-black/10"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Let&apos;s Go!
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Brand footer */}
        <p className="text-center text-zinc-300 text-xs font-bold uppercase tracking-widest">
          AxomPrep Pocket Coach
        </p>
      </div>
    </div>
  )
}
