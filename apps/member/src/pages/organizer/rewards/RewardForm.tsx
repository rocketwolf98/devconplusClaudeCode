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

    // Resolve final image URL:
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
