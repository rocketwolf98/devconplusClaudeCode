# Organizer Rewards CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ComingSoonModal placeholders on the organizer rewards page with working Create and Edit full-page forms backed by Supabase, including image upload to a dedicated storage bucket.

**Architecture:** A shared `RewardForm` component handles all field logic for both create and edit modes (determined by the presence of a `reward` prop). Two thin shell pages (`RewardCreate`, `RewardEdit`) wrap it and handle navigation and the Danger Zone delete. The existing `useRewardsStore` gains three new actions plus a separate `allRewards`/`isLoadingAll` slice so the organizer list shows all rewards while the member page continues seeing only active ones.

**Tech Stack:** React 19, Vite 7, TypeScript strict, Tailwind CSS v3, Zustand v5, React Hook Form v7 + Zod, framer-motion, lucide-react, Supabase JS v2, `@devcon-plus/supabase` types.

**Spec:** `docs/superpowers/specs/2026-03-22-organizer-rewards-crud-design.md`

---

## File Map

| Action | Path |
|---|---|
| **Create** | `apps/member/src/pages/organizer/rewards/rewardFormConstants.tsx` |
| **Create** | `apps/member/src/pages/organizer/rewards/RewardForm.tsx` |
| **Create** | `apps/member/src/pages/organizer/rewards/RewardCreate.tsx` |
| **Create** | `apps/member/src/pages/organizer/rewards/RewardEdit.tsx` |
| **Modify** | `apps/member/src/stores/useRewardsStore.ts` |
| **Modify** | `apps/member/src/pages/organizer/rewards/RewardsManagement.tsx` |
| **Modify** | `apps/member/src/router.tsx` |

---

## Task 1: Supabase — Migration, Bucket, and RLS

**Files:** Supabase SQL editor or MCP tool

- [ ] **Step 1.1: Run the guard migration**

Open the Supabase SQL editor for your project and run:

```sql
-- Safe no-op if columns already exist (added in rewards-engine commit 600187f)
ALTER TABLE rewards
  ADD COLUMN IF NOT EXISTS stock_remaining integer,
  ADD COLUMN IF NOT EXISTS max_per_user integer;
```

Expected: `ALTER TABLE` — no error.

- [ ] **Step 1.2: Create the `reward-images` storage bucket**

In the Supabase dashboard → Storage → New bucket:
- Name: `reward-images`
- Public bucket: ✅ (enable)
- File size limit: 5 MB

- [ ] **Step 1.3: Add RLS upload policy**

In the Supabase SQL editor run:

```sql
CREATE POLICY "Authenticated users can upload reward images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reward-images'
    AND auth.role() = 'authenticated'
  );
```

Expected: `CREATE POLICY` — no error.

- [ ] **Step 1.4: Verify**

In Supabase → Storage → `reward-images`, confirm the bucket exists and is public.
In Supabase → Authentication → Policies → `storage.objects`, confirm the new policy appears.

---

## Task 2: Extend `useRewardsStore`

**File:** `apps/member/src/stores/useRewardsStore.ts`

- [ ] **Step 2.1: Read the current file**

Read `apps/member/src/stores/useRewardsStore.ts` in full before touching it.

- [ ] **Step 2.2: Replace the file with the updated store**

Replace the entire contents with:

```ts
import { create } from 'zustand'
import type { Reward, RewardRedemption } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'
import { usePointsStore } from './usePointsStore'
import type { RewardFormData } from '../pages/organizer/rewards/rewardFormConstants'

interface RewardsState {
  // Member-facing: active rewards only
  rewards: Reward[]
  // Organizer-facing: all rewards including inactive
  allRewards: Reward[]

  redemptions: RewardRedemption[]

  isLoading: boolean      // member fetchRewards / redeemReward / loadRedemptions
  isLoadingAll: boolean   // organizer fetchAllRewards
  error: string | null

  fetchRewards: () => Promise<void>
  fetchAllRewards: () => Promise<void>
  createReward: (data: RewardFormData, imageUrl: string | null) => Promise<void>
  updateReward: (id: string, data: RewardFormData, imageUrl: string | null) => Promise<void>
  deleteReward: (id: string) => Promise<void>
  subscribeToChanges: () => () => void
  redeemReward: (rewardId: string) => Promise<{ success: boolean; error?: string }>
  loadRedemptions: () => Promise<void>
}

export const useRewardsStore = create<RewardsState>((set, get) => ({
  rewards: [],
  allRewards: [],
  redemptions: [],
  isLoading: false,
  isLoadingAll: false,
  error: null,

  // ── Member: active rewards only ─────────────────────────────────────────
  fetchRewards: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ rewards: (data ?? []) as Reward[], isLoading: false })
  },

  // ── Organizer: all rewards ───────────────────────────────────────────────
  fetchAllRewards: async () => {
    set({ isLoadingAll: true, error: null })
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('points_cost', { ascending: true })
    if (error) {
      set({ error: error.message, isLoadingAll: false })
      return
    }
    set({ allRewards: (data ?? []) as Reward[], isLoadingAll: false })
  },

  // ── Create ───────────────────────────────────────────────────────────────
  createReward: async (data, imageUrl) => {
    const payload = {
      name: data.name,
      description: data.description || null,
      points_cost: data.points_cost,
      type: data.type,
      claim_method: data.claim_method,
      stock_remaining: data.stock_remaining ?? null,
      max_per_user: data.max_per_user ?? null,
      is_active: data.is_active,
      is_coming_soon: data.is_coming_soon,
      image_url: imageUrl,
    }
    const { error } = await supabase.from('rewards').insert(payload)
    if (error) throw new Error(error.message)
    await Promise.all([get().fetchAllRewards(), get().fetchRewards()])
  },

  // ── Update ───────────────────────────────────────────────────────────────
  updateReward: async (id, data, imageUrl) => {
    const payload = {
      name: data.name,
      description: data.description || null,
      points_cost: data.points_cost,
      type: data.type,
      claim_method: data.claim_method,
      stock_remaining: data.stock_remaining ?? null,
      max_per_user: data.max_per_user ?? null,
      is_active: data.is_active,
      is_coming_soon: data.is_coming_soon,
      image_url: imageUrl,
    }
    const { error } = await supabase.from('rewards').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
    await Promise.all([get().fetchAllRewards(), get().fetchRewards()])
  },

  // ── Delete (soft) ────────────────────────────────────────────────────────
  deleteReward: async (id) => {
    const { error } = await supabase
      .from('rewards')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw new Error(error.message)
    // Optimistic: remove from both slices immediately
    set((s) => ({
      rewards: s.rewards.filter((r) => r.id !== id),
      allRewards: s.allRewards.filter((r) => r.id !== id),
    }))
  },

  // ── Realtime ─────────────────────────────────────────────────────────────
  subscribeToChanges: () => {
    const channel = supabase
      .channel('rewards-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rewards' },
        (payload) => {
          const updated = payload.new as Reward
          if (!updated.is_active) {
            set((s) => ({
              rewards: s.rewards.filter((r) => r.id !== updated.id),
              allRewards: s.allRewards.filter((r) => r.id !== updated.id),
            }))
          }
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  },

  // ── Redeem ───────────────────────────────────────────────────────────────
  redeemReward: async (rewardId) => {
    const user = useAuthStore.getState().user
    if (!user) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase.rpc('redeem_reward', {
      p_reward_id: rewardId,
      p_user_id: user.id,
    })
    if (error) return { success: false, error: error.message }

    const [, refreshedRewards] = await Promise.all([
      usePointsStore.getState().loadTotalPoints(),
      supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true }),
    ])
    if (!refreshedRewards.error) {
      set({ rewards: (refreshedRewards.data ?? []) as Reward[] })
    }
    return { success: true }
  },

  // ── Redemption history ───────────────────────────────────────────────────
  loadRedemptions: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('reward_redemptions')
      .select('*')
      .eq('user_id', user.id)
      .order('redeemed_at', { ascending: false })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ redemptions: (data ?? []) as RewardRedemption[], isLoading: false })
  },
}))
```

- [ ] **Step 2.3: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors. If `RewardFormData` is flagged as missing (the file doesn't exist yet), continue — it will resolve once Task 3 is complete. Fix any other errors before proceeding.

- [ ] **Step 2.4: Commit**

```bash
git add apps/member/src/stores/useRewardsStore.ts
git commit -m "feat(rewards): extend store with allRewards, createReward, updateReward"
```

---

## Task 3: Create `rewardFormConstants.tsx`

**File:** `apps/member/src/pages/organizer/rewards/rewardFormConstants.tsx`

- [ ] **Step 3.1: Create the file**

```tsx
import { z } from 'zod'

// ── Zod schema ────────────────────────────────────────────────────────────────

export const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional().or(z.literal('')),
  points_cost: z.number({ coerce: true }).int().min(1, 'Must be at least 1 pt'),
  type: z.enum(['physical', 'digital']),
  claim_method: z.enum(['onsite', 'digital_delivery']),
  stock_remaining: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(0, 'Cannot be negative').nullable()
  ),
  max_per_user: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(1, 'Must be at least 1').nullable()
  ),
  is_active: z.boolean().default(true),
  is_coming_soon: z.boolean().default(true),
})

export type RewardFormData = z.infer<typeof schema>

// ── Styles (match eventFormConstants.tsx) ────────────────────────────────────

export const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20'

export const labelClass =
  'block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5'

// ── SectionHeader (JSX — same pattern as eventFormConstants.tsx) ─────────────

export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-t border-slate-100 pt-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
        {title}
      </p>
    </div>
  )
}
```

- [ ] **Step 3.2: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors (the import in `useRewardsStore.ts` resolves now).

- [ ] **Step 3.3: Commit**

```bash
git add apps/member/src/pages/organizer/rewards/rewardFormConstants.tsx
git commit -m "feat(rewards): add rewardFormConstants (Zod schema, styles, SectionHeader)"
```

---

## Task 4: Create `RewardForm.tsx`

**File:** `apps/member/src/pages/organizer/rewards/RewardForm.tsx`

This is the shared form used by both Create and Edit. Edit mode is inferred from the presence of the `reward` prop.

- [ ] **Step 4.1: Create the file**

```tsx
import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ImagePlus, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/useAuthStore'
import { useRewardsStore } from '../../../stores/useRewardsStore'
import type { Reward } from '@devcon-plus/supabase'
import {
  schema,
  type RewardFormData,
  inputClass,
  labelClass,
  SectionHeader,
} from './rewardFormConstants'
import { staggerContainer, fadeUp } from '../../../lib/animation'

// ── Props ─────────────────────────────────────────────────────────────────────

export interface RewardFormProps {
  /** Present = edit mode; absent = create mode */
  reward?: Reward
  /** Called after a successful save — shell navigates away */
  onSuccess: () => void
  /** Optional content rendered below the submit buttons (e.g. Danger Zone) */
  dangerZone?: React.ReactNode
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RewardForm({ reward, onSuccess, dangerZone }: RewardFormProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { createReward, updateReward } = useRewardsStore()
  const isEdit = Boolean(reward)

  // ── Image state ──────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(
    reward?.image_url ?? null
  )
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Form ─────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RewardFormData>({
    resolver: zodResolver(schema),
    defaultValues: reward
      ? {
          name: reward.name,
          description: reward.description ?? '',
          points_cost: reward.points_cost,
          type: reward.type,
          claim_method: reward.claim_method,
          stock_remaining: reward.stock_remaining ?? undefined,
          max_per_user: reward.max_per_user ?? undefined,
          is_active: reward.is_active,
          is_coming_soon: reward.is_coming_soon,
        }
      : {
          type: 'physical',
          claim_method: 'onsite',
          is_active: true,
          is_coming_soon: true,
        },
  })

  const watchedType = watch('type')

  // Auto-set claim_method when type changes
  useEffect(() => {
    if (watchedType === 'digital') {
      setValue('claim_method', 'digital_delivery')
    } else {
      setValue('claim_method', 'onsite')
    }
  }, [watchedType, setValue])

  // ── Image handlers ───────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverUploadError(null)
    setCoverPreview(URL.createObjectURL(file))
  }

  const removeCover = () => {
    setCoverFile(null)
    setCoverPreview(null)
    setCoverUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (data: RewardFormData) => {
    setSubmitError(null)
    setCoverUploadError(null)

    // Resolve final image URL
    // - coverPreview + no new file → keep existing URL (or null if cleared)
    // - coverPreview + new file → will upload below
    // - no coverPreview → null (cleared or never set)
    let imageUrl: string | null =
      coverPreview && !coverFile ? (reward?.image_url ?? null) : null

    if (coverFile) {
      if (!user?.id) {
        setSubmitError('Session expired. Please sign in again.')
        return
      }
      const path = `${user.id}/${Date.now()}-${coverFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reward-images')
        .upload(path, coverFile)
      if (uploadError) {
        setCoverUploadError('Image upload failed — reward will be saved without image.')
      } else {
        const { data: urlData } = supabase.storage
          .from('reward-images')
          .getPublicUrl(uploadData.path)
        imageUrl = urlData.publicUrl
      }
    }

    try {
      if (isEdit && reward) {
        await updateReward(reward.id, data, imageUrl)
      } else {
        await createReward(data, imageUrl)
      }
      onSuccess()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to save reward. Please try again.'
      )
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-10">
      {/* Header */}
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">
          {isEdit ? 'Edit Reward' : 'Add Reward'}
        </h1>
        <p className="text-white/60 text-sm mt-0.5">
          {isEdit ? 'Update reward details.' : 'Add a new item to the rewards catalog.'}
        </p>
      </div>

      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="p-4 space-y-5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* ── DETAILS ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Details" />
          <div className="space-y-4">
            <div>
              <label className={labelClass}>
                Name <span className="text-red normal-case">*</span>
              </label>
              <input
                {...register('name')}
                className={inputClass}
                placeholder="e.g. DEVCON Cap"
              />
              {errors.name && (
                <p className="text-xs text-red mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Description{' '}
                <span className="text-slate-300 normal-case font-normal">optional</span>
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Brief description of this reward"
              />
            </div>

            <div>
              <label className={labelClass}>
                Points Cost <span className="text-red normal-case">*</span>
              </label>
              <input
                {...register('points_cost')}
                type="number"
                min={1}
                step={1}
                className={inputClass}
                placeholder="e.g. 500"
              />
              {errors.points_cost && (
                <p className="text-xs text-red mt-1">{errors.points_cost.message}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── IMAGE ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Image" />
          {coverPreview ? (
            <div className="relative rounded-xl overflow-hidden mb-3 border border-slate-200">
              <img
                src={coverPreview}
                alt="Reward preview"
                className="w-full h-44 object-cover"
              />
              <button
                type="button"
                onClick={removeCover}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-36 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue hover:text-blue transition-colors mb-3"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-xs font-medium">Tap to upload image</span>
              <span className="text-[10px] text-slate-300">JPG, PNG, WebP — optional</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          {coverUploadError && (
            <p className="text-xs text-red mt-1">{coverUploadError}</p>
          )}
        </motion.div>

        {/* ── TYPE & CLAIM ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Type & Claim" />
          <div className="space-y-4">
            <div>
              <label className={labelClass}>
                Type <span className="text-red normal-case">*</span>
              </label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                    {(
                      [
                        ['physical', 'Physical'],
                        ['digital', 'Digital'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                          field.value === value
                            ? 'bg-blue text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div>
              <label className={labelClass}>
                Claim Method <span className="text-red normal-case">*</span>
              </label>
              <Controller
                control={control}
                name="claim_method"
                render={({ field }) => (
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                    {(
                      [
                        ['onsite', 'On-site'],
                        ['digital_delivery', 'Digital Delivery'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        disabled={watchedType === 'digital'}
                        onClick={() => field.onChange(value)}
                        className={`flex-1 py-2 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          field.value === value
                            ? 'bg-blue text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
              {watchedType === 'digital' && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Digital rewards always use Digital Delivery.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── INVENTORY ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Inventory" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Stock{' '}
                <span className="text-slate-300 normal-case font-normal">optional</span>
              </label>
              <input
                {...register('stock_remaining')}
                type="number"
                min={0}
                step={1}
                className={inputClass}
                placeholder="Unlimited"
              />
              {errors.stock_remaining && (
                <p className="text-xs text-red mt-1">{errors.stock_remaining.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Max / User{' '}
                <span className="text-slate-300 normal-case font-normal">optional</span>
              </label>
              <input
                {...register('max_per_user')}
                type="number"
                min={1}
                step={1}
                className={inputClass}
                placeholder="No limit"
              />
              {errors.max_per_user && (
                <p className="text-xs text-red mt-1">{errors.max_per_user.message}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── VISIBILITY ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Visibility" />
          <div className="space-y-3">
            {(
              [
                {
                  field: 'is_active' as const,
                  label: 'Active',
                  desc: 'Visible in the member rewards catalog',
                },
                {
                  field: 'is_coming_soon' as const,
                  label: 'Coming Soon',
                  desc: 'Shows "Coming Soon" badge — redemption disabled on member side',
                },
              ] as const
            ).map(({ field, label, desc }) => (
              <Controller
                key={field}
                control={control}
                name={field}
                render={({ field: f }) => (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <input
                      type="checkbox"
                      id={field}
                      checked={f.value}
                      onChange={(e) => f.onChange(e.target.checked)}
                      className="w-4 h-4 accent-blue rounded"
                    />
                    <div>
                      <label
                        htmlFor={field}
                        className="text-sm font-semibold text-slate-900 cursor-pointer"
                      >
                        {label}
                      </label>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                  </div>
                )}
              />
            ))}
          </div>
        </motion.div>

        {/* Submit error */}
        {submitError && (
          <motion.p
            variants={fadeUp}
            className="text-xs text-red bg-red/5 border border-red/20 rounded-xl px-3 py-2"
          >
            {submitError}
          </motion.p>
        )}

        {/* Actions */}
        <motion.div variants={fadeUp} className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors disabled:opacity-60"
          >
            {isSubmitting
              ? isEdit ? 'Saving…' : 'Creating…'
              : isEdit ? 'Save Changes' : 'Add Reward'}
          </button>
        </motion.div>

        {/* Danger zone slot (edit only — passed from RewardEdit) */}
        {dangerZone}
      </motion.form>
    </div>
  )
}
```

- [ ] **Step 4.2: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4.3: Commit**

```bash
git add apps/member/src/pages/organizer/rewards/RewardForm.tsx
git commit -m "feat(rewards): add shared RewardForm component (create + edit modes)"
```

---

## Task 5: Create `RewardCreate.tsx`

**File:** `apps/member/src/pages/organizer/rewards/RewardCreate.tsx`

- [ ] **Step 5.1: Create the file**

```tsx
import { useNavigate } from 'react-router-dom'
import { RewardForm } from './RewardForm'

export function RewardCreate() {
  const navigate = useNavigate()
  return (
    <RewardForm
      onSuccess={() => navigate('/organizer/rewards')}
    />
  )
}
```

- [ ] **Step 5.2: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 5.3: Commit**

```bash
git add apps/member/src/pages/organizer/rewards/RewardCreate.tsx
git commit -m "feat(rewards): add RewardCreate page shell"
```

---

## Task 6: Create `RewardEdit.tsx`

**File:** `apps/member/src/pages/organizer/rewards/RewardEdit.tsx`

This shell fetches the reward by `:id`, guards for loading/not-found, renders `RewardForm` with `dangerZone`, and handles single-step delete.

- [ ] **Step 6.1: Create the file**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRewardsStore } from '../../../stores/useRewardsStore'
import { RewardForm } from './RewardForm'
import NotFound from '../../NotFound'

export function RewardEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { allRewards, isLoadingAll, fetchAllRewards, deleteReward } = useRewardsStore()

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Fetch if store is empty
  useEffect(() => {
    if (allRewards.length === 0) void fetchAllRewards()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reward = allRewards.find((r) => r.id === id)

  // Loading guard
  if (isLoadingAll && allRewards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-blue border-t-transparent animate-spin" />
      </div>
    )
  }

  // Not-found guard
  if (!reward) return <NotFound />

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteReward(reward.id)
      navigate('/organizer/rewards', { replace: true })
    } catch {
      setDeleteError('Failed to remove reward. Please try again.')
      setIsDeleting(false)
    }
  }

  // ── Danger Zone (passed as slot prop to RewardForm) ───────────────────────
  const dangerZone = (
    <>
      <div className="mt-2 border-t-2 border-red/20 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-red/60 mb-3">
          Danger Zone
        </p>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => setDeleteOpen(true)}
          className="w-full py-3 rounded-xl border border-red/30 text-red text-sm font-bold hover:bg-red/5 transition-colors"
        >
          Remove from Catalog
        </motion.button>
      </div>

      {/* Single-step delete bottom sheet */}
      <AnimatePresence>
        {deleteOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isDeleting) setDeleteOpen(false) }}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl px-5 pt-4 pb-10"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-7 h-7 text-red" />
                </div>
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Remove from Catalog?
                </h2>
                <p className="text-sm text-slate-500">
                  <span className="font-semibold text-slate-700">
                    &ldquo;{reward.name}&rdquo;
                  </span>{' '}
                  will be removed from the member rewards catalog.
                </p>
                {deleteError && (
                  <p className="mt-3 text-sm text-red font-semibold">{deleteError}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { void handleDelete() }}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl bg-red text-white text-sm font-bold disabled:opacity-60"
                >
                  {isDeleting ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )

  return (
    <RewardForm
      reward={reward}
      onSuccess={() => navigate('/organizer/rewards')}
      dangerZone={dangerZone}
    />
  )
}
```

- [ ] **Step 6.2: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 6.3: Commit**

```bash
git add apps/member/src/pages/organizer/rewards/RewardEdit.tsx
git commit -m "feat(rewards): add RewardEdit page shell with single-step danger zone"
```

---

## Task 7: Update `RewardsManagement.tsx`

**File:** `apps/member/src/pages/organizer/rewards/RewardsManagement.tsx`

Replace the `ComingSoonModal` calls for Add/Edit with real navigation, and switch the list to use `allRewards`.

- [ ] **Step 7.1: Read the current file**

Read `apps/member/src/pages/organizer/rewards/RewardsManagement.tsx` in full.

- [ ] **Step 7.2: Replace the file with the updated version**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, Plus, Gift, Package } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRewardsStore } from '../../../stores/useRewardsStore'
import { staggerContainer, cardItem, fadeUp } from '../../../lib/animation'

export function OrgRewardsManagement() {
  const navigate = useNavigate()
  const { allRewards, isLoadingAll, fetchAllRewards, deleteReward } = useRewardsStore()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => { void fetchAllRewards() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteReward(id)
      setDeleteConfirmId(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      {/* Sticky header */}
      <div className="bg-blue px-4 pt-12 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Rewards</h1>
            <p className="text-white/60 text-sm mt-0.5">Manage the catalog</p>
          </div>
          <button
            onClick={() => navigate('/organizer/rewards/create')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white text-sm font-bold rounded-xl active:bg-white/30 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Reward
          </button>
        </div>
      </div>

      <motion.div
        className="p-4 space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Summary strip */}
        <motion.div variants={fadeUp} className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-card px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue/10 flex items-center justify-center">
              <Gift className="w-4 h-4 text-blue" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 leading-none">
                {allRewards.length}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Total Rewards</p>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-card px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-green" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 leading-none">
                {allRewards.filter((r) => r.is_active).length}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Active</p>
            </div>
          </div>
        </motion.div>

        {deleteError && (
          <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2">
            {deleteError}
          </p>
        )}

        {/* Rewards list */}
        {isLoadingAll && allRewards.length === 0 ? (
          <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue border-t-transparent animate-spin mx-auto" />
          </motion.div>
        ) : (
          <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="visible">
            {allRewards.length === 0 ? (
              <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <p className="text-base font-bold text-slate-700">No rewards yet</p>
                <p className="text-sm text-slate-400 mt-1">Add items to the catalog.</p>
              </motion.div>
            ) : (
              allRewards.map((reward) => (
                <motion.div
                  key={reward.id}
                  variants={cardItem}
                  className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden"
                >
                  <div className="flex items-stretch gap-0">
                    {/* Image / placeholder */}
                    <div className="w-20 shrink-0">
                      {reward.image_url ? (
                        <img
                          src={reward.image_url}
                          alt={reward.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue/10 flex items-center justify-center">
                          <Gift className="w-6 h-6 text-blue/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 leading-snug truncate">
                            {reward.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {reward.description}
                          </p>
                        </div>

                        {/* Action buttons */}
                        {deleteConfirmId !== reward.id && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => navigate(`/organizer/rewards/${reward.id}/edit`)}
                              className="w-7 h-7 rounded-lg bg-blue/10 flex items-center justify-center active:bg-blue/20 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-blue" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(reward.id)}
                              className="w-7 h-7 rounded-lg bg-red/10 flex items-center justify-center active:bg-red/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs font-bold text-blue bg-blue/10 px-2 py-0.5 rounded-full">
                          {reward.points_cost.toLocaleString()} pts
                        </span>
                        <span className="text-xs text-slate-400 capitalize">
                          {reward.claim_method === 'digital_delivery' ? 'Digital' : 'On-site'}
                        </span>
                        {!reward.is_active && (
                          <span className="text-[10px] font-bold text-red/60 bg-red/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            Inactive
                          </span>
                        )}
                        {reward.is_coming_soon && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            Coming Soon
                          </span>
                        )}
                      </div>

                      {/* Inline delete confirm */}
                      {deleteConfirmId === reward.id && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-500">Remove from catalog?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={isDeleting}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => void handleDelete(reward.id)}
                              disabled={isDeleting}
                              className="px-3 py-1.5 rounded-lg bg-red text-white text-xs font-semibold disabled:opacity-50"
                            >
                              {isDeleting ? 'Removing…' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 7.2: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors. `ComingSoonModal` import can be removed — it's no longer used.

- [ ] **Step 7.3: Commit**

```bash
git add apps/member/src/pages/organizer/rewards/RewardsManagement.tsx
git commit -m "feat(rewards): wire up Add/Edit navigation, switch list to allRewards"
```

---

## Task 8: Register New Routes in `router.tsx`

**File:** `apps/member/src/router.tsx`

- [ ] **Step 8.1: Read the router file**

Read `apps/member/src/router.tsx` — specifically the organizer imports block and the `/organizer` children array.

- [ ] **Step 8.2: Add the two imports**

In the organizer imports block (around line 45), add:

```ts
import { RewardCreate } from './pages/organizer/rewards/RewardCreate'
import { RewardEdit } from './pages/organizer/rewards/RewardEdit'
```

- [ ] **Step 8.3: Register the routes — `create` BEFORE `:id/edit`**

In the organizer `children` array, add after the existing `{ path: '/organizer/rewards', element: <OrgRewardsManagement /> }` line:

```ts
{ path: '/organizer/rewards/create',      element: <RewardCreate /> },
{ path: '/organizer/rewards/:id/edit',    element: <RewardEdit /> },
```

> **Critical:** `create` must come before `:id/edit` in the array. React Router v7 matches in declaration order — if `:id/edit` were first, navigating to `/organizer/rewards/create` would match `id = "create"`.

- [ ] **Step 8.4: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 8.5: Commit**

```bash
git add apps/member/src/router.tsx
git commit -m "feat(rewards): register /organizer/rewards/create and /:id/edit routes"
```

---

## Task 9: Final Integration — Typecheck + Smoke Test

- [ ] **Step 9.1: Full typecheck**

```bash
npm run typecheck
```

Expected: zero errors across all packages.

- [ ] **Step 9.2: Start the dev server**

```bash
npm run dev:member
```

Open `http://localhost:5173` on a mobile viewport (DevTools → 390px).

- [ ] **Step 9.3: Create a reward smoke test**

1. Sign in as an organizer → navigate to `/organizer/rewards`
2. Tap **Add Reward** → confirm you land on `/organizer/rewards/create`
3. Fill in: Name = "Test Lanyard", Points = 50, Type = Physical, Claim = On-site, Is Active ✅, Is Coming Soon ✅
4. Upload a test image (any JPG)
5. Tap **Add Reward** → confirm redirect to `/organizer/rewards`
6. Confirm the new reward appears in the list with the uploaded image thumbnail
7. In Supabase → Table Editor → `rewards` → confirm the row exists with the correct `image_url`

- [ ] **Step 9.4: Edit a reward smoke test**

1. On `/organizer/rewards`, tap the ✏ Edit button on the new reward
2. Confirm you land on `/organizer/rewards/{id}/edit` with all fields pre-filled including the image preview
3. Change Points Cost to 75
4. Tap **Save Changes** → confirm redirect back to `/organizer/rewards`
5. Confirm the card now shows 75 pts
6. In Supabase → confirm `points_cost = 75` on that row

- [ ] **Step 9.5: Type-toggle smoke test**

1. Open Edit on any reward → change Type to **Digital**
2. Confirm Claim Method auto-switches to "Digital Delivery" and its buttons are disabled
3. Switch back to **Physical** → confirm Claim Method resets to "On-site" and becomes interactive

- [ ] **Step 9.6: Delete smoke test (inline)**

1. On `/organizer/rewards`, tap the 🗑 Trash button on the test reward
2. Confirm inline "Remove from catalog? Cancel / Remove" appears
3. Tap **Remove** → confirm the card disappears immediately from the list
4. In Supabase → confirm `is_active = false` on that row (soft delete)
5. Navigate to `/rewards` (member view) → confirm the reward is NOT shown

- [ ] **Step 9.7: Delete smoke test (Danger Zone)**

1. Navigate to `/organizer/rewards` → tap Edit on any reward
2. Scroll to Danger Zone → tap **Remove from Catalog**
3. Confirm single bottom sheet appears with the reward name
4. Tap **Remove** → confirm redirect to `/organizer/rewards` with the reward gone
5. In Supabase → confirm `is_active = false`

- [ ] **Step 9.8: Image fallback smoke test**

1. Create a reward with no image
2. Navigate to `/rewards` (member view) as a member
3. Confirm the card shows the gradient + icon fallback (no broken image)

- [ ] **Step 9.9: Final commit**

```bash
git add .
git commit -m "feat(rewards): complete organizer rewards CRUD — create, edit, delete, image upload"
```
