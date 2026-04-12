import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CaseOutline, AltArrowDownOutline, MapPointOutline, ShareOutline, StarOutline, UsersGroupRoundedOutline, FileText, Github, Trophy, BoltOutline } from 'solar-icon-set'
import { useJobsStore } from '../../stores/useJobsStore'
import { useMissionsStore } from '../../stores/useMissionsStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { SkeletonJobCard } from '../../components/Skeleton'
import PromotedBadge from '../../components/PromotedBadge'
import { WORK_TYPE_LABELS } from '../../lib/constants'
import { staggerContainer, cardItem } from '../../lib/animation'
import type { MissionDifficulty } from '@devcon-plus/supabase'

// ── Difficulty styling ────────────────────────────────────────────────────────

const DIFF_CONFIG: Record<MissionDifficulty, { label: string; cls: string; dot: string }> = {
  easy:   { label: 'Easy',   cls: 'bg-green/10 text-green',       dot: 'bg-green'       },
  medium: { label: 'Medium', cls: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400'   },
  hard:   { label: 'Hard',   cls: 'bg-red/10 text-red',           dot: 'bg-red'         },
}

// ── Jobs tab ──────────────────────────────────────────────────────────────────

function JobsTab({ initialExpandId }: { initialExpandId: string | null }) {
  const { jobs, isLoading, error, fetchJobs } = useJobsStore()
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandId)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    void fetchJobs()
  }, [fetchJobs])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && jobs.length === 0) {
        void fetchJobs()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [jobs.length, fetchJobs])

  // Deep-link scroll
  useEffect(() => {
    if (initialExpandId && cardRefs.current[initialExpandId]) {
      setTimeout(() => {
        cardRefs.current[initialExpandId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [initialExpandId, isLoading])

  if (isLoading) return (
    <div className="space-y-3 px-4 pt-5">
      {Array.from({ length: 5 }).map((_, i) => <SkeletonJobCard key={i} />)}
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <p className="text-sm text-red mb-4">{error}</p>
      <button onClick={() => void fetchJobs()} className="text-sm text-primary font-semibold">Try again</button>
    </div>
  )

  if (jobs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CaseOutline className="w-8 h-8 text-primary/50" />
      </div>
      <h2 className="text-base font-bold text-slate-900 mb-1">No listings yet</h2>
      <p className="text-sm text-slate-500">Check back soon for new opportunities.</p>
    </div>
  )

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3 px-4 pt-5 pb-24">
      {jobs.map(job => {
        const isExpanded = expandedId === job.id
        return (
          <motion.div
            key={job.id}
            variants={cardItem}
            ref={(el) => { cardRefs.current[job.id] = el }}
            className="bg-white rounded-2xl shadow-card overflow-hidden"
          >
            <motion.button
              onClick={() => setExpandedId(prev => prev === job.id ? null : job.id)}
              className="w-full p-4 text-left"
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 text-sm leading-snug">{job.title}</p>
                    {job.is_promoted && <PromotedBadge />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{job.company}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {WORK_TYPE_LABELS[job.work_type] ?? job.work_type}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPointOutline className="w-3 h-3 shrink-0" />{job.location}
                      </span>
                    )}
                  </div>
                </div>
                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="shrink-0 mt-0.5">
                  <AltArrowDownOutline className="w-4 h-4 text-slate-400" />
                </motion.div>
              </div>
            </motion.button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-4">
                    {job.description
                      ? <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{job.description}</p>
                      : <p className="text-sm text-slate-400 italic">No description provided.</p>
                    }
                    {job.apply_url && (
                      <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-primary text-white font-semibold text-sm py-3 rounded-xl">
                        Apply Now <ShareOutline className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// ── Missions tab ──────────────────────────────────────────────────────────────

function MissionsTab({ initialExpandId }: { initialExpandId: string | null }) {
  const { missions, participants, submissions, isLoading, error, fetchAll, startMission, submitMission, subscribeToChanges } = useMissionsStore()
  const { user } = useAuthStore()
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandId)
  // Per-mission: is the PR link input visible?
  const [submitOpen, setSubmitOpen] = useState<Record<string, boolean>>({})
  const [prDrafts, setPrDrafts] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({})
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    void fetchAll()
    const unsubscribe = subscribeToChanges()
    return unsubscribe
  }, [fetchAll, subscribeToChanges])

  // Deep-link scroll
  useEffect(() => {
    if (initialExpandId && cardRefs.current[initialExpandId]) {
      setTimeout(() => {
        cardRefs.current[initialExpandId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [initialExpandId, isLoading])

  const handleStart = async (missionId: string) => {
    if (!user) return
    try {
      await startMission(missionId, user.id)
    } catch {
      // Already joined or network error — silently ignore, UI will reflect store state
    }
  }

  const openSubmit = (missionId: string, existingLink?: string) => {
    setPrDrafts((p) => ({ ...p, [missionId]: existingLink ?? '' }))
    setSubmitOpen((p) => ({ ...p, [missionId]: true }))
    setSubmitErrors((p) => ({ ...p, [missionId]: '' }))
  }

  const handleSubmit = async (missionId: string) => {
    if (!user) return
    const link = (prDrafts[missionId] ?? '').trim()
    if (!link) {
      setSubmitErrors((p) => ({ ...p, [missionId]: 'Please enter your PR link.' }))
      return
    }
    setSubmitting((p) => ({ ...p, [missionId]: true }))
    setSubmitErrors((p) => ({ ...p, [missionId]: '' }))
    try {
      await submitMission(missionId, user.id, link)
      setSubmitOpen((p) => ({ ...p, [missionId]: false }))
    } catch (err) {
      setSubmitErrors((p) => ({ ...p, [missionId]: err instanceof Error ? err.message : 'Submit failed.' }))
    } finally {
      setSubmitting((p) => ({ ...p, [missionId]: false }))
    }
  }

  if (isLoading) return (
    <div className="space-y-3 px-4 pt-5">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonJobCard key={i} />)}
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <p className="text-sm text-red mb-4">{error}</p>
      <button onClick={() => void fetchAll()} className="text-sm text-primary font-semibold">Try again</button>
    </div>
  )

  if (missions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <BoltOutline className="w-8 h-8 text-primary/50" />
      </div>
      <h2 className="text-base font-bold text-slate-900 mb-1">No missions yet</h2>
      <p className="text-sm text-slate-500">Check back soon for new bounties.</p>
    </div>
  )

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3 px-4 pt-5 pb-24">
      {missions.map((mission) => {
        const diff = DIFF_CONFIG[mission.difficulty]
        const isClaimed = mission.status === 'claimed'
        const isExpanded = expandedId === mission.id

        const participantCount = participants.filter((p) => p.mission_id === mission.id).length
        const submissionCount  = submissions.filter((s)  => s.mission_id === mission.id).length

        const isJoined      = user ? participants.some((p) => p.mission_id === mission.id && p.user_id === user.id) : false
        const mySubmission  = user ? submissions.find((s)  => s.mission_id === mission.id && s.user_id === user.id) : undefined
        const hasWon        = mySubmission?.status === 'approved'

        return (
          <motion.div
            key={mission.id}
            variants={cardItem}
            ref={(el) => { cardRefs.current[mission.id] = el }}
            className={`bg-white rounded-2xl shadow-card overflow-hidden transition-opacity ${isClaimed && !hasWon ? 'opacity-60' : ''}`}
          >
            {/* Card header — tap to expand */}
            <motion.button
              onClick={() => !isClaimed && setExpandedId(prev => prev === mission.id ? null : mission.id)}
              className={`w-full p-4 text-left ${isClaimed && !hasWon ? 'cursor-default' : ''}`}
              whileTap={isClaimed && !hasWon ? {} : { scale: 0.98 }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-bold text-slate-900 text-sm leading-snug">{mission.title}</p>
                    {isClaimed && !hasWon && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                        Claimed
                      </span>
                    )}
                    {hasWon && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gold/20 text-amber-700 flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5" /> You won!
                      </span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Difficulty */}
                    <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${diff.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                      {diff.label}
                    </span>
                    {/* XP */}
                    <span className="flex items-center gap-1 text-xs font-bold text-gold">
                      <StarOutline className="w-3 h-3 fill-gold text-gold" />
                      +{mission.xp_reward} XP
                    </span>
                  </div>

                  {/* Live stats */}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <UsersGroupRoundedOutline className="w-3 h-3" />{participantCount} joined
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <FileText className="w-3 h-3" />{submissionCount} submitted
                    </span>
                  </div>
                </div>

                {!isClaimed && (
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="shrink-0 mt-1">
                    <AltArrowDownOutline className="w-4 h-4 text-slate-400" />
                  </motion.div>
                )}
              </div>
            </motion.button>

            {/* Expanded body */}
            <AnimatePresence initial={false}>
              {isExpanded && !isClaimed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-5 pt-3 border-t border-slate-100 space-y-4">
                    {/* Description */}
                    {mission.description && (
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                        {mission.description}
                      </p>
                    )}

                    {/* GitHub link */}
                    {mission.github_url && (
                      <a href={mission.github_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                        <Github className="w-4 h-4 shrink-0" />
                        <span className="truncate text-xs">{mission.github_url}</span>
                        <ShareOutline className="w-3 h-3 shrink-0 ml-auto" />
                      </a>
                    )}

                    {/* ── State A: Not joined ── */}
                    {!isJoined && !hasWon && (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => void handleStart(mission.id)}
                        className="w-full bg-primary text-white font-bold text-sm py-3 rounded-xl"
                      >
                        Start Mission
                      </motion.button>
                    )}

                    {/* ── State B/C: Joined — show submit UI ── */}
                    {isJoined && !hasWon && (
                      <div className="space-y-2">
                        {/* Current submission info */}
                        {mySubmission && !submitOpen[mission.id] && (
                          <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Your Submission</p>
                            <a href={mySubmission.pr_link} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue hover:underline break-all block">{mySubmission.pr_link}</a>
                            <p className="text-[10px] text-slate-400">
                              Submitted {new Date(mySubmission.submitted_at).toLocaleString()}
                            </p>
                          </div>
                        )}

                        {/* PR link input */}
                        <AnimatePresence>
                          {submitOpen[mission.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2"
                            >
                              <input
                                type="url"
                                value={prDrafts[mission.id] ?? ''}
                                onChange={(e) => setPrDrafts((p) => ({ ...p, [mission.id]: e.target.value }))}
                                placeholder="https://github.com/your/repo/pull/123"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                              />
                              {submitErrors[mission.id] && (
                                <p className="text-xs text-red">{submitErrors[mission.id]}</p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSubmitOpen((p) => ({ ...p, [mission.id]: false }))}
                                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold"
                                >
                                  Cancel
                                </button>
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => void handleSubmit(mission.id)}
                                  disabled={submitting[mission.id]}
                                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50"
                                >
                                  {submitting[mission.id] ? 'Submitting…' : mySubmission ? 'Update Link' : 'Submit PR'}
                                </motion.button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* CTA button */}
                        {!submitOpen[mission.id] && (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => openSubmit(mission.id, mySubmission?.pr_link)}
                            className={`w-full font-bold text-sm py-3 rounded-xl ${
                              mySubmission
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-primary text-white'
                            }`}
                          >
                            {mySubmission ? 'Update PR Link' : 'Submit PR Link'}
                          </motion.button>
                        )}
                      </div>
                    )}

                    {/* ── State D: Won ── */}
                    {hasWon && (
                      <div className="bg-gold/10 rounded-xl p-3 flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-amber-700">You won this mission!</p>
                          <p className="text-xs text-amber-600">+{mission.xp_reward} XP has been added to your account.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobsList() {
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = searchParams.get('tab')
  const idParam  = searchParams.get('id')

  const [activeTab, setActiveTab] = useState<'jobs' | 'missions'>(
    tabParam === 'missions' ? 'missions' : 'jobs'
  )

  const switchTab = (tab: 'jobs' | 'missions') => {
    setActiveTab(tab)
    setSearchParams(tab === 'missions' ? { tab: 'missions' } : {}, { replace: true })
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-primary px-4 pt-14 pb-5 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Opportunity Hub</h1>
        <p className="text-white/70 text-sm mt-0.5">Jobs &amp; bounty missions for Filipino devs</p>

        {/* Tab switcher */}
        <div className="flex gap-2 mt-4">
          {(['jobs', 'missions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === tab
                  ? 'bg-white text-primary'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              {tab === 'jobs' ? 'Jobs Board' : 'Missions'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {activeTab === 'jobs'     && <JobsTab     initialExpandId={activeTab === 'jobs'     ? idParam : null} />}
        {activeTab === 'missions' && <MissionsTab initialExpandId={activeTab === 'missions' ? idParam : null} />}
      </div>
    </div>
  )
}
