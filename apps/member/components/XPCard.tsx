import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'

interface XPCardProps {
  totalPoints: number
  nextMilestone: number
}

export function XPCard({ totalPoints, nextMilestone }: XPCardProps) {
  const progress = Math.min(totalPoints / nextMilestone, 1)
  const remaining = Math.max(nextMilestone - totalPoints, 0)

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.starBox}>
          <Text style={styles.starIcon}>⭐</Text>
        </View>
        <View>
          <Text style={styles.label}>Points+ Balance</Text>
          <Text style={styles.points}>{totalPoints} XP</Text>
        </View>
      </View>
      <View style={styles.barWrap}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.hint}>
          {remaining > 0 ? `${remaining} XP to next reward milestone` : 'Milestone reached! 🎉'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  starBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(248,198,48,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    fontSize: 20,
  },
  label: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  points: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  barWrap: {
    marginTop: 10,
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: 3,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
})
