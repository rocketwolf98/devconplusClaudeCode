import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { fadeUp, staggerContainer } from '../../../lib/animation'
import { useEventsStore } from '../../../stores/useEventsStore'
import { useAuthStore } from '../../../stores/useAuthStore'
import { supabase } from '../../../lib/supabase'
import {
  schema,
  type FormData,
  type CustomFormField,
  inputClass,
  labelClass,
  CATEGORY_OPTIONS,
  DEVCON_PROGRAM_OPTIONS,
  VISIBILITY_OPTIONS,
  ATTENDANCE_POINTS_BY_CATEGORY,
  DEFAULT_VOLUNTEER_POINTS,
  TAG_MAX_LENGTH,
  SectionHeader,
  CustomFieldsBuilder,
} from './eventFormConstants'

// ── Component ─────────────────────────────────────────────────────────────────

export function OrgEventCreate() {
  const navigate = useNavigate()
  const { createEvent } = useEventsStore()
  const { user } = useAuthStore()

  // Cover image (managed outside RHF)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null)
  // Track the object URL so we can revoke it to prevent memory leaks
  const coverObjectUrlRef = useRef<string | null>(null)

  // Revoke the blob URL when the component unmounts
  useEffect(() => {
    return () => {
      if (coverObjectUrlRef.current) URL.revokeObjectURL(coverObjectUrlRef.current)
    }
  }, [])

  // Tags (managed outside RHF)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Visibility (managed outside RHF for segmented control feel)
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'draft'>('public')

  // Custom registration form fields
  const [customFields, setCustomFields] = useState<CustomFormField[]>([])

  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      points_value:      5,
      volunteer_points:  DEFAULT_VOLUNTEER_POINTS,
      requires_approval: false,
      is_chapter_locked: true,
      is_free:           true,
      ticket_price_php:  0,
      visibility:        'public',
      tags:              [],
    },
  })

  const isFree     = watch('is_free')
  const category   = watch('category')

  // Auto-set attendance points when the organizer picks a category
  const prevCategoryRef = useRef<string | undefined>(undefined)
  if (category && category !== prevCategoryRef.current) {
    prevCategoryRef.current = category
    setValue('points_value', ATTENDANCE_POINTS_BY_CATEGORY[category], { shouldValidate: false })
  }

  // ── Cover image handlers ─────────────────────────────────────────────────

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setCoverUploadError('Only JPG, PNG, or WebP images are allowed.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setCoverUploadError('Image must be under 5 MB.')
      return
    }
    // Revoke previous object URL before creating a new one
    if (coverObjectUrlRef.current) URL.revokeObjectURL(coverObjectUrlRef.current)
    setCoverFile(file)
    setCoverUploadError(null)
    const url = URL.createObjectURL(file)
    coverObjectUrlRef.current = url
    setCoverPreview(url)
  }

  const removeCover = () => {
    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current)
      coverObjectUrlRef.current = null
    }
    setCoverFile(null)
    setCoverPreview(null)
    setCoverUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Tag handlers ──────────────────────────────────────────────────────────

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = tagInput.trim()
      if (val && val.length <= TAG_MAX_LENGTH && !tags.includes(val)) {
        setTags((prev) => [...prev, val])
      }
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    if (!data.devcon_category) {
      setSubmitError('Please select a DEVCON Program.')
      return
    }
    if (!user?.chapter_id) {
      setSubmitError('Your account is not linked to a chapter. Contact an admin.')
      return
    }
    setSubmitError(null)
    setCoverUploadError(null)

    // Upload cover image (non-blocking on failure)
    let cover_image_url: string | null = null
    if (coverFile) {
      const safeName = coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
      const path = `${user.id}/${Date.now()}-${safeName}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-covers')
        .upload(path, coverFile)
      if (uploadError) {
        setCoverUploadError('Cover image upload failed — event will be saved without image.')
      } else {
        const { data: urlData } = supabase.storage
          .from('event-covers')
          .getPublicUrl(uploadData.path)
        cover_image_url = urlData.publicUrl
      }
    }

    try {
      await createEvent({
        title:               data.title,
        description:         data.description,
        location:            data.location,
        event_date:          data.event_date,
        end_date:            data.end_date ?? null,
        category:            data.category,
        devcon_category:     data.devcon_category,
        tags,
        visibility,
        is_free:             data.is_free,
        ticket_price_php:    data.is_free ? 0 : data.ticket_price_php,
        capacity:            data.capacity ?? null,
        points_value:        data.points_value,
        volunteer_points:    data.volunteer_points,
        requires_approval:   data.requires_approval,
        is_chapter_locked:   data.is_chapter_locked,
        cover_image_url,
        chapter_id:          user.chapter_id,
        created_by:          user.id,
        custom_form_schema:  customFields.length > 0 ? customFields : null,
      })
      navigate('/organizer/events')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create event. Please try again.')
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
        <h1 className="text-xl font-bold text-white">Create Event</h1>
        <p className="text-white/60 text-sm mt-0.5">Fill in the details for your chapter event.</p>
      </div>

      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="p-4 space-y-5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* ── EVENT DETAILS ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Event Details" />
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Event Title</label>
              <input
                {...register('title')}
                className={inputClass}
                placeholder="e.g. DEVCON Summit Manila 2026"
              />
              {errors.title && (
                <p className="text-xs text-red mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                {...register('description')}
                rows={4}
                className={`${inputClass} resize-none`}
                placeholder="What is this event about?"
              />
              {errors.description && (
                <p className="text-xs text-red mt-1">{errors.description.message}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── MEDIA ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Media" />

          {/* Cover image preview */}
          {coverPreview ? (
            <div className="relative rounded-xl overflow-hidden mb-3 border border-slate-200">
              <img
                src={coverPreview}
                alt="Cover preview"
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
              <span className="text-xs font-medium">Tap to upload cover image</span>
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

        {/* ── CATEGORIZATION ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Categorization" />
          <div className="space-y-4">
            {/* DEVCON Program */}
            <div>
              <label className={labelClass}>
                DEVCON Program <span className="text-red normal-case">*</span>
              </label>
              <Controller
                control={control}
                name="devcon_category"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {DEVCON_PROGRAM_OPTIONS.map((opt) => {
                      const isSelected = field.value === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          style={isSelected ? { backgroundColor: opt.hex, borderColor: opt.hex } : undefined}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            isSelected
                              ? opt.darkText ? 'text-slate-900' : 'text-white'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue hover:text-blue'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              />
              {errors.devcon_category && (
                <p className="text-xs text-red mt-1">{errors.devcon_category.message}</p>
              )}
            </div>

            {/* Category radio pills */}
            <div>
              <label className={labelClass}>Category <span className="text-red normal-case">*</span></label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          field.value === opt.value
                            ? 'bg-blue text-white border-blue'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue hover:text-blue'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.category && (
                <p className="text-xs text-red mt-1">{errors.category.message}</p>
              )}
            </div>

            {/* Tags chip input */}
            <div>
              <label className={labelClass}>Tags <span className="text-slate-300 normal-case font-normal">optional</span></label>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type a tag, press Enter"
                className={inputClass}
                maxLength={TAG_MAX_LENGTH}
              />
              <p className="text-[10px] text-slate-400 mt-1">Max {TAG_MAX_LENGTH} chars per tag.</p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue/10 text-blue text-xs rounded-full"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="leading-none hover:text-blue-dark"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── SCHEDULE ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Schedule" />
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Location</label>
              <input
                {...register('location')}
                className={inputClass}
                placeholder="Venue or Online"
              />
              {errors.location && (
                <p className="text-xs text-red mt-1">{errors.location.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Date & Time</label>
                <input
                  {...register('event_date')}
                  type="datetime-local"
                  className={inputClass}
                />
                {errors.event_date && (
                  <p className="text-xs text-red mt-1">{errors.event_date.message}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>End Date & Time</label>
                <input
                  {...register('end_date')}
                  type="datetime-local"
                  className={inputClass}
                />
                {errors.end_date && (
                  <p className="text-xs text-red mt-1">{errors.end_date.message}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── ACCESS SETTINGS ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Access Settings" />
          <div className="space-y-4">
            {/* Visibility segmented control */}
            <div>
              <label className={labelClass}>Visibility</label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      visibility === opt.value
                        ? 'bg-blue text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Requires approval toggle */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-200 p-4">
              <input
                {...register('requires_approval')}
                type="checkbox"
                id="requires_approval"
                className="w-4 h-4 accent-blue rounded"
              />
              <div>
                <label
                  htmlFor="requires_approval"
                  className="text-sm font-semibold text-slate-900 cursor-pointer"
                >
                  Require Registration Approval
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manually approve each registration before members receive their QR ticket.
                </p>
              </div>
            </div>

            {/* Chapter lock toggle */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-200 p-4">
              <input
                {...register('is_chapter_locked')}
                type="checkbox"
                id="is_chapter_locked"
                className="w-4 h-4 accent-blue rounded"
              />
              <div>
                <label
                  htmlFor="is_chapter_locked"
                  className="text-sm font-semibold text-slate-900 cursor-pointer"
                >
                  Lock to Chapter
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Only members of your chapter can register for this event. Disable to allow members from any chapter to join.
                </p>
              </div>
            </div>

            {/* Ticket price toggle */}
            <div>
              <label className={labelClass}>Ticket Price</label>
              <div className="flex gap-3">
                <Controller
                  control={control}
                  name="is_free"
                  render={({ field }) => (
                    <>
                      <button
                        type="button"
                        onClick={() => field.onChange(true)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          field.value
                            ? 'bg-blue text-white border-blue'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue hover:text-blue'
                        }`}
                      >
                        Free
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange(false)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          !field.value
                            ? 'bg-blue text-white border-blue'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue hover:text-blue'
                        }`}
                      >
                        Paid
                      </button>
                    </>
                  )}
                />
              </div>

              {!isFree && (
                <div className="mt-3">
                  <label className={labelClass}>Price (PHP)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                      ₱
                    </span>
                    <input
                      {...register('ticket_price_php')}
                      type="number"
                      min={1}
                      step={1}
                      className={`${inputClass} pl-8`}
                      placeholder="0"
                    />
                  </div>
                  {errors.ticket_price_php && (
                    <p className="text-xs text-red mt-1">{errors.ticket_price_php.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Capacity */}
            <div>
              <label className={labelClass}>
                Capacity <span className="text-slate-300 normal-case font-normal">optional</span>
              </label>
              <input
                {...register('capacity')}
                type="number"
                min={1}
                step={1}
                className={inputClass}
                placeholder="Unlimited"
              />
              {errors.capacity && (
                <p className="text-xs text-red mt-1">{errors.capacity.message}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── ENGAGEMENT ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Engagement" />
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Attendance XP</label>
              <input
                {...register('points_value')}
                type="number"
                className={inputClass}
                min={1}
                max={1000}
                step={1}
              />
              {errors.points_value && (
                <p className="text-xs text-red mt-1">{errors.points_value.message}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Auto-set based on category — Tech Talk/Social/Networking = 5 pts, Workshop/Brown Bag/Hackathon = 150 pts.
              </p>
            </div>

            <div>
              <label className={labelClass}>Volunteer XP</label>
              <input
                {...register('volunteer_points')}
                type="number"
                className={inputClass}
                min={0}
                max={1000}
                step={1}
              />
              {errors.volunteer_points && (
                <p className="text-xs text-red mt-1">{errors.volunteer_points.message}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                XP awarded on top of attendance XP for members who volunteer at this event. Default: 500 pts.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── REGISTRATION QUESTIONS ── */}
        <motion.div variants={fadeUp}>
          <SectionHeader title="Registration Questions" />
          <p className="text-xs text-slate-400 mb-3">
            Add custom fields to collect extra information from registrants.
          </p>
          <CustomFieldsBuilder
            customFields={customFields}
            setCustomFields={setCustomFields}
          />
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
            {isSubmitting ? 'Creating…' : 'Create Event'}
          </button>
        </motion.div>
      </motion.form>
    </div>
  )
}
