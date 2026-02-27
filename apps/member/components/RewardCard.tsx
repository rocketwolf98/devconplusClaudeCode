import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors, Shadows } from '@/constants/colors'
import type { Reward } from '@devcon-plus/supabase'

const REWARD_EMOJI: Record<string, string> = {
  'Lanyard': '🏷️',
  'Coffee Voucher': '☕',
  'DEVCON Cap': '🧢',
  'Mechanical Keyboard': '⌨️',
  'Wireless Headset': '🎧',
  'DEVCON Shirt': '👕',
  'DEVCON Mug': '🍵',
}

interface RewardCardProps {
  reward: Reward
  onPress: () => void
}

export function RewardCard({ reward, onPress }: RewardCardProps) {
  const emoji = REWARD_EMOJI[reward.name] ?? '🎁'

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imgBox}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{reward.name}</Text>
        <View style={styles.xpPill}>
          <Text style={styles.xpText}>⭐ {reward.points_cost.toLocaleString()} XP</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 12,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  imgBox: {
    height: 120,
    backgroundColor: Colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 48,
  },
  body: {
    padding: 12,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.slate900,
    marginBottom: 6,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blue10,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  xpText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.blue,
  },
})
