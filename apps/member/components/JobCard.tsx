import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors, Shadows } from '@/constants/colors'
import { PromotedBadge } from './PromotedBadge'
import type { Job } from '@devcon-plus/supabase'

interface JobCardProps {
  job: Job
  isSaved?: boolean
  onPress: () => void
  onToggleSave?: () => void
}

export function JobCard({ job, isSaved = false, onPress, onToggleSave }: JobCardProps) {
  const initial = job.company.charAt(0).toUpperCase()

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.top}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.company}>{job.company}</Text>
          <Text style={styles.title}>{job.title}</Text>
        </View>
        {onToggleSave && (
          <TouchableOpacity onPress={onToggleSave}>
            <Text style={styles.heart}>{isSaved ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText}>📍 {job.location}</Text>
        <Text style={styles.metaText}>{job.work_type}</Text>
      </View>
      {job.is_promoted && <PromotedBadge />}
      <TouchableOpacity
        style={styles.viewBtn}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.viewBtnText}>View Opportunity</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 12,
    padding: 14,
    ...Shadows.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.blue10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.blue,
  },
  info: {
    flex: 1,
  },
  company: {
    fontSize: 11,
    color: Colors.slate400,
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate900,
  },
  heart: {
    fontSize: 18,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 11,
    color: Colors.slate500,
  },
  viewBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.slate300,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate700,
  },
})
