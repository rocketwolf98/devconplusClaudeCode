import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeftOutline } from 'solar-icon-set'
import { useAuthStore } from '../../stores/useAuthStore'
import { useInterestsStore } from '../../stores/useInterestsStore'
import { fadeUp } from '../../lib/animation'
import logoHorizontal from '../../assets/logos/logo-horizontal.svg'

type Step = 0 | 1 | 2

const STEP_TITLES: Record<Step, string> = {
  0: 'What excites you?',
  1: 'Your stack?',
  2: 'Your role?',
}
const STEP_SUBS: Record<Step, string> = {
  0: 'Pick your tech interests',
  1: 'Languages & frameworks you use',
  2: 'How you give back to the community',
}
const STEP_CATEGORIES: Record<Step, 'interest' | 'tech_stack' | 'community_role'> = {
  0: 'interest',
  1: 'tech_stack',
  2: 'community_role',
}

export default function InterestQuiz() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromProfile = searchParams.get('from') === 'profile'

  const user = useAuthStore((s) => s.user)
  const { options, isLoading, fetchOptions, saveSelections } = useInterestsStore()

  const [step, setStep] = useState<Step>(0)
  // Three separate selection arrays: [interests, techStack, communityRoles]
  const [selections, setSelections] = useState<[number[], number[], number[]]>(
    [[], [], []]
  )
  const [isSaving, setIsSaving] = useState(false)
  const didPrefillRef = useRef(false)

  // Pre-fill from existing profile on re-entry — runs once only
  useEffect(() => {
    if (user && !didPrefillRef.current) {
      setSelections([
        user.interests ?? [],
        user.tech_stack ?? [],
        user.community_roles ?? [],
      ])
      didPrefillRef.current = true
    }
  }, [user])

  useEffect(() => {
    void fetchOptions()
  }, [fetchOptions])

  const stepOptions = useMemo(
    () => options.filter((o) => o.category === STEP_CATEGORIES[step]),
    [options, step]
  )

  const currentSelection = selections[step]

  function togglePill(id: number) {
    setSelections((prev) => {
      const next = [...prev] as [number[], number[], number[]]
      const s = new Set(next[step])
      if (s.has(id)) s.delete(id)
      else s.add(id)
      next[step] = Array.from(s)
      return next
    })
  }

  async function commitAndExit(toSave: [number[], number[], number[]]) {
    setIsSaving(true)
    try {
      await saveSelections(toSave[0], toSave[1], toSave[2])
      navigate(fromProfile ? '/profile' : '/home', { replace: true })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleNext() {
    if (step < 2) {
      setStep((s) => (s + 1) as Step)
    } else {
      await commitAndExit(selections)
    }
  }

  async function handleSkipStep() {
    if (step < 2) {
      // Clear this step's selection in local state and advance — no DB write yet
      setSelections((prev) => {
        const next = [...prev] as [number[], number[], number[]]
        next[step] = []
        return next
      })
      setStep((s) => (s + 1) as Step)
    } else {
      // Last step — save with empty community_roles
      await commitAndExit([selections[0], selections[1], []])
    }
  }

  async function handleSkipAll() {
    await commitAndExit([[], [], []])
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      {/* Header — matches OrganizerCodeGate shell */}
      <div className="px-4 pt-12 pb-10 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          {fromProfile ? (
            <button
              onClick={() => navigate('/profile')}
              className="text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeftOutline className="w-5 h-5" />
            </button>
          ) : (
            <img
              src={logoHorizontal}
              alt="DEVCON+"
              className="h-7 w-auto"
            />
          )}
          <button
            onClick={fromProfile ? () => navigate('/profile') : handleSkipAll}
            disabled={isSaving}
            className="text-white/60 text-md3-label-md font-semibold hover:text-white/80 transition-colors disabled:opacity-40"
          >
            {fromProfile ? 'Cancel' : 'Skip all'}
          </button>
        </div>

        {/* Step dots */}
        <div className="flex gap-[5px] mb-3">
          {([0, 1, 2] as Step[]).map((i) => (
            <div
              key={i}
              className={`h-[3px] rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-white' : 'w-[18px] bg-white/30'
              }`}
            />
          ))}
        </div>

        <h1 className="text-md3-title-lg font-black text-white mb-1">
          {STEP_TITLES[step]}
        </h1>
        <p className="text-md3-body-md text-white/70">{STEP_SUBS[step]}</p>
      </div>

      {/* Body card */}
      <div className="flex-1 bg-slate-50 rounded-t-3xl px-4 pt-6 pb-32 overflow-y-auto">
        <p className="text-md3-label-md text-slate-400 mb-3">
          {currentSelection.length > 0
            ? `${currentSelection.length} selected`
            : 'None selected — you can skip'}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-wrap gap-[6px] mb-6"
          >
            {stepOptions.map((option) => {
              const selected = currentSelection.includes(option.id)
              return (
                <motion.button
                  key={option.id}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => togglePill(option.id)}
                  className={`px-3 py-[5px] rounded-full text-md3-label-md font-semibold border-[1.5px] transition-colors ${
                    selected
                      ? 'bg-blue text-white border-blue'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {option.label}
                </motion.button>
              )
            })}
          </motion.div>
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => void handleNext()}
          disabled={isSaving}
          className="w-full bg-navy text-white font-bold py-4 rounded-2xl text-md3-label-lg disabled:opacity-60"
        >
          {isSaving
            ? 'Saving…'
            : step < 2
            ? 'Next →'
            : fromProfile
            ? 'Save changes'
            : 'Save & Go to App →'}
        </motion.button>

        <button
          onClick={() => void handleSkipStep()}
          disabled={isSaving}
          className="w-full text-center text-md3-label-md text-slate-400 mt-3 disabled:opacity-40"
        >
          Skip this step
        </button>
      </div>
    </div>
  )
}
