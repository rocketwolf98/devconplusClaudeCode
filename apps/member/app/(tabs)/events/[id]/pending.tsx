import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TopBar } from '@/components/TopBar'
import { Colors } from '@/constants/colors'

export default function PendingScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TopBar title="Registration" />
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>⏳</Text>
        </View>
        <Text style={styles.heading}>Request Submitted!</Text>
        <Text style={styles.desc}>
          Your registration is pending approval by the chapter organizers. You&apos;ll be
          notified once confirmed.
        </Text>

        {/* Status tracker */}
        <View style={styles.tracker}>
          <Text style={styles.trackerLabel}>Registration Status</Text>
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepDotDone]}>
              <Text style={styles.stepDotCheck}>✓</Text>
            </View>
            <View>
              <Text style={styles.stepTitle}>Request Submitted</Text>
              <Text style={styles.stepSub}>Just now</Text>
            </View>
          </View>
          <View style={[styles.stepRow, { opacity: 0.45 }]}>
            <View style={styles.stepDotPending}>
              <Text style={styles.stepDotNum}>2</Text>
            </View>
            <View>
              <Text style={[styles.stepTitle, { color: Colors.slate400 }]}>Pending Approval</Text>
              <Text style={styles.stepSub}>Awaiting organizer review</Text>
            </View>
          </View>
          <View style={[styles.stepRow, { opacity: 0.3 }]}>
            <View style={styles.stepDotPending}>
              <Text>🎟️</Text>
            </View>
            <View>
              <Text style={[styles.stepTitle, { color: Colors.slate400 }]}>You&apos;re In!</Text>
              <Text style={styles.stepSub}>Ticket will appear here</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace('/(tabs)/events')}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,158,11,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 40 },
  heading: { fontSize: 22, fontWeight: '900', color: Colors.slate900, marginBottom: 8 },
  desc: {
    fontSize: 14,
    color: Colors.slate500,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 280,
  },
  tracker: {
    width: '100%',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  trackerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.slate400,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepDotDone: { backgroundColor: Colors.green },
  stepDotCheck: { fontSize: 13, color: Colors.white, fontWeight: '700' },
  stepDotPending: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepDotNum: { fontSize: 13, color: Colors.slate400 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: Colors.slate900 },
  stepSub: { fontSize: 11, color: Colors.slate400, marginTop: 1 },
  doneBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: Colors.slate300,
    borderRadius: 30,
    paddingVertical: 13,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: 14, fontWeight: '600', color: Colors.slate700 },
})
