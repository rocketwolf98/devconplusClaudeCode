import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TopBar } from '@/components/TopBar'
import { PromotedBadge } from '@/components/PromotedBadge'
import { ComingSoonModal } from '@/components/ComingSoonModal'
import { Colors, Shadows } from '@/constants/colors'
import { useJobsStore } from '@/stores/useJobsStore'

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: 'Remote',
  onsite: 'Onsite',
  hybrid: 'Hybrid',
  full_time: 'Full-time',
  part_time: 'Part-time',
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { jobs, savedIds, toggleSave } = useJobsStore()
  const [showModal, setShowModal] = useState(false)

  const job = jobs.find((j) => j.id === id)
  if (!job) return null

  const isSaved = savedIds.includes(job.id)
  const workTypeLabel = WORK_TYPE_LABELS[job.work_type] ?? job.work_type

  const handleApply = () => {
    if (job.apply_url) {
      Linking.openURL(job.apply_url).catch(() => setShowModal(true))
    } else {
      setShowModal(true)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TopBar title="Job Details" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Company avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{job.company.charAt(0).toUpperCase()}</Text>
          </View>
          {job.is_promoted && (
            <View style={styles.promotedWrap}>
              <PromotedBadge />
            </View>
          )}
        </View>

        <Text style={styles.company}>{job.company}</Text>
        <Text style={styles.title}>{job.title}</Text>

        {/* Chips row */}
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>📍 {job.location}</Text>
          </View>
          <View style={[styles.chip, styles.chipBlue]}>
            <Text style={[styles.chipText, styles.chipTextBlue]}>{workTypeLabel}</Text>
          </View>
        </View>

        {/* Posted date */}
        <Text style={styles.postedAt}>
          Posted {new Date(job.posted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* About the role */}
        <Text style={styles.sectionTitle}>About the Role</Text>
        <Text style={styles.description}>{job.description}</Text>

        {/* What we look for */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Requirements</Text>
        <View style={styles.reqList}>
          {[
            'Strong problem-solving skills and attention to detail',
            'Experience with modern development tools and practices',
            'Excellent communication and collaboration skills',
            'Passion for building products that make a difference',
          ].map((req, i) => (
            <View key={i} style={styles.reqRow}>
              <Text style={styles.reqBullet}>•</Text>
              <Text style={styles.reqText}>{req}</Text>
            </View>
          ))}
        </View>

        {/* XP earn note */}
        <View style={styles.xpNote}>
          <Text style={styles.xpNoteText}>
            💼 Found via DEVCON+ Jobs Board · Powered by the DEVCON community
          </Text>
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.saveBtn, isSaved && styles.saveBtnActive]}
          onPress={() => toggleSave(job.id)}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextActive]}>
            {isSaved ? '❤️ Saved' : '🤍 Save'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyBtn}
          onPress={handleApply}
          activeOpacity={0.85}
        >
          <Text style={styles.applyBtnText}>Apply Now →</Text>
        </TouchableOpacity>
      </View>

      <ComingSoonModal visible={showModal} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },
  content: { paddingHorizontal: 20, paddingBottom: 16 },

  avatarWrap: { alignItems: 'flex-start', paddingTop: 20, marginBottom: 12 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.blue10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.blue20,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: Colors.blue },
  promotedWrap: { marginTop: 8 },

  company: { fontSize: 13, color: Colors.slate400, fontWeight: '500', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '900', color: Colors.slate900, marginBottom: 12 },

  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    backgroundColor: Colors.white,
  },
  chipBlue: {
    borderColor: Colors.blue20,
    backgroundColor: Colors.blue10,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.slate500 },
  chipTextBlue: { color: Colors.blue },

  postedAt: { fontSize: 11, color: Colors.slate400, marginBottom: 16 },

  divider: { height: 1, backgroundColor: Colors.slate100, marginVertical: 16 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.blue, marginBottom: 10 },
  description: { fontSize: 14, color: Colors.slate500, lineHeight: 23 },

  reqList: { gap: 8 },
  reqRow: { flexDirection: 'row', gap: 8 },
  reqBullet: { fontSize: 14, color: Colors.blue, lineHeight: 22 },
  reqText: { flex: 1, fontSize: 13, color: Colors.slate500, lineHeight: 22 },

  xpNote: {
    marginTop: 20,
    backgroundColor: Colors.blue10,
    borderRadius: 10,
    padding: 12,
  },
  xpNoteText: { fontSize: 11, color: Colors.blue, lineHeight: 17 },

  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    ...Shadows.sm,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: Colors.slate300,
    borderRadius: 30,
    alignItems: 'center',
  },
  saveBtnActive: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blue10,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: Colors.slate700 },
  saveBtnTextActive: { color: Colors.blue },
  applyBtn: {
    flex: 2,
    paddingVertical: 13,
    backgroundColor: Colors.blue,
    borderRadius: 30,
    alignItems: 'center',
  },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
})
