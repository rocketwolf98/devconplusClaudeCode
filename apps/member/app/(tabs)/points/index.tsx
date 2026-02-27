import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TopBar } from '@/components/TopBar'
import { Colors } from '@/constants/colors'

interface EarnRow {
  icon: string
  activity: string
  desc: string
  xp: string
  source: string
}

const WAYS_TO_EARN: EarnRow[] = [
  { icon: '✍️', activity: 'Sign Up', desc: 'Create your DEVCON+ account', xp: '+500 XP', source: 'signup' },
  { icon: '🎟️', activity: 'Attend an Event', desc: 'Scan your QR at the door', xp: '+100–300 XP', source: 'event_attendance' },
  { icon: '🎤', activity: 'Speak at an Event', desc: 'Present a talk or workshop', xp: '+700 XP', source: 'speaking' },
  { icon: '☕', activity: 'Brown Bag Session', desc: 'Host or join a brown bag', xp: '+250 XP', source: 'brown_bag' },
  { icon: '🙋', activity: 'Volunteer at Chapter', desc: 'Help organize chapter events', xp: '+100–500 XP', source: 'volunteering' },
  { icon: '❤️', activity: 'Like Content', desc: 'React to DEVCON posts', xp: '+5 XP', source: 'content_like' },
]

const SHARE_OPTIONS = [
  { icon: '💼', label: 'LinkedIn', color: '#0A66C2' },
  { icon: '🐦', label: 'Twitter / X', color: Colors.slate700 },
  { icon: '📘', label: 'Facebook', color: '#1877F2' },
  { icon: '📋', label: 'Copy Link', color: Colors.slate500 },
]

export default function EarnPointsScreen() {
  const [activeTab, setActiveTab] = useState<'ways' | 'share'>('ways')

  const handleShare = async () => {
    await Share.share({
      message: 'Join DEVCON+ — the official app for the Philippine tech community! Earn XP for attending events, speaking, and volunteering. https://devcon.ph',
    })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TopBar title="Earn Points" />

      {/* Pill tabs */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ways' && styles.tabActive]}
            onPress={() => setActiveTab('ways')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'ways' && styles.tabTextActive]}>
              Ways to Earn
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'share' && styles.tabActive]}
            onPress={() => setActiveTab('share')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'share' && styles.tabTextActive]}>
              Share & Earn
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {activeTab === 'ways' ? (
          <>
            <Text style={styles.sectionHint}>
              Complete activities to earn XP and unlock rewards.
            </Text>
            <View style={styles.earnList}>
              {WAYS_TO_EARN.map((item) => (
                <View key={item.source} style={styles.earnRow}>
                  <View style={styles.earnIconWrap}>
                    <Text style={styles.earnIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.earnInfo}>
                    <Text style={styles.earnActivity}>{item.activity}</Text>
                    <Text style={styles.earnDesc}>{item.desc}</Text>
                  </View>
                  <View style={styles.xpPill}>
                    <Text style={styles.xpPillText}>{item.xp}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Referral card */}
            <View style={styles.referralCard}>
              <Text style={styles.referralTitle}>Invite Friends, Earn XP</Text>
              <Text style={styles.referralDesc}>
                Earn <Text style={styles.referralXp}>+25 XP</Text> for every friend who joins DEVCON+ using your referral link.
              </Text>
              <View style={styles.referralLink}>
                <Text style={styles.referralLinkText}>devcon.ph/join?ref=marie-santos</Text>
              </View>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                <Text style={styles.shareBtnText}>Share Your Link</Text>
              </TouchableOpacity>
            </View>

            {/* Share to socials */}
            <Text style={styles.shareLabel}>Share on Social Media</Text>
            <Text style={styles.shareSubLabel}>
              Earn <Text style={{ fontWeight: '700', color: Colors.blue }}>+10 XP</Text> per share (once per platform per day).
            </Text>
            <View style={styles.socialGrid}>
              {SHARE_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s.label}
                  style={styles.socialCard}
                  onPress={handleShare}
                  activeOpacity={0.8}
                >
                  <Text style={styles.socialIcon}>{s.icon}</Text>
                  <Text style={styles.socialLabel}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },

  tabsWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.slate100,
    borderRadius: 30,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 30,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.slate400 },
  tabTextActive: { color: Colors.slate900 },

  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  sectionHint: { fontSize: 13, color: Colors.slate500, marginBottom: 14, lineHeight: 20 },

  earnList: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    overflow: 'hidden',
  },
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  earnIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.blue10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  earnIcon: { fontSize: 18 },
  earnInfo: { flex: 1 },
  earnActivity: { fontSize: 14, fontWeight: '700', color: Colors.slate900 },
  earnDesc: { fontSize: 11, color: Colors.slate400, marginTop: 1 },
  xpPill: {
    backgroundColor: Colors.blue10,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  xpPillText: { fontSize: 11, fontWeight: '700', color: Colors.blue },

  referralCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    padding: 16,
    marginBottom: 20,
  },
  referralTitle: { fontSize: 17, fontWeight: '800', color: Colors.slate900, marginBottom: 6 },
  referralDesc: { fontSize: 13, color: Colors.slate500, lineHeight: 20, marginBottom: 12 },
  referralXp: { fontWeight: '700', color: Colors.blue },
  referralLink: {
    backgroundColor: Colors.slate50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.slate200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  referralLinkText: { fontSize: 12, color: Colors.blue, fontFamily: 'monospace' as const },
  shareBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  shareLabel: { fontSize: 15, fontWeight: '800', color: Colors.slate900, marginBottom: 4 },
  shareSubLabel: { fontSize: 12, color: Colors.slate400, marginBottom: 14 },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  socialCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  socialIcon: { fontSize: 24 },
  socialLabel: { fontSize: 12, fontWeight: '600', color: Colors.slate700 },
})
