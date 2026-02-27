import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors, Shadows } from '@/constants/colors'
import { PromotedBadge } from './PromotedBadge'
import type { NewsPost } from '@devcon-plus/supabase'

interface NewsCardProps {
  post: NewsPost
  onPress?: () => void
}

export function NewsCard({ post, onPress }: NewsCardProps) {
  const categoryLabel = post.category === 'devcon' ? 'DEVCON' : 'TECH COMMUNITY'
  const timeAgo = '2 min read'

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.top}>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText}>{categoryLabel}</Text>
        </View>
        <Text style={styles.readTime}>⏱ {timeAgo}</Text>
      </View>
      <Text style={styles.title}>{post.title}</Text>
      {post.body && (
        <Text style={styles.desc} numberOfLines={2}>{post.body}</Text>
      )}
      {post.is_promoted && (
        <View style={styles.promotedWrap}>
          <PromotedBadge />
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 12,
    padding: 14,
    ...Shadows.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: Colors.blue,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  readTime: {
    fontSize: 11,
    color: Colors.slate400,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate900,
    lineHeight: 20,
  },
  desc: {
    fontSize: 13,
    color: Colors.slate500,
    marginTop: 4,
    lineHeight: 18,
  },
  promotedWrap: {
    marginTop: 8,
  },
})
