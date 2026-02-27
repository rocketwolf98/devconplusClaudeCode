import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors, Shadows } from '@/constants/colors'
import { PromotedBadge } from './PromotedBadge'
import type { Job } from '@devcon-plus/supabase'

interface JobCardMiniProps {
  job: Job
  onPress: () => void
}

export function JobCardMini({ job, onPress }: JobCardMiniProps) {
  const initial = job.company.charAt(0).toUpperCase()

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.top}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.company} numberOfLines={1}>{job.company}</Text>
          <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText}>📍 {job.location}</Text>
        <Text style={styles.metaText}>{job.work_type}</Text>
      </View>
      {job.is_promoted ? (
        <PromotedBadge />
      ) : (
        <View style={styles.featuredChip}>
          <Text style={styles.featuredText}>FEATURED</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    minWidth: 220,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 12,
    padding: 12,
    ...Shadows.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.blue10,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 10,
    color: Colors.slate400,
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.slate900,
  },
  meta: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 10,
    color: Colors.slate500,
  },
  featuredChip: {
    backgroundColor: 'rgba(248,198,48,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,198,48,0.4)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  featuredText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92620A',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
