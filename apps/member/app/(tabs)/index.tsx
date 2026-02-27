import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BlueHeader } from '@/components/BlueHeader'
import { XPCard } from '@/components/XPCard'
import { EventRow } from '@/components/EventRow'
import { JobCardMini } from '@/components/JobCardMini'
import { NewsCard } from '@/components/NewsCard'
import { TransactionRow } from '@/components/TransactionRow'
import { Colors } from '@/constants/colors'
import { useAuthStore } from '@/stores/useAuthStore'
import { useEventsStore } from '@/stores/useEventsStore'
import { useJobsStore } from '@/stores/useJobsStore'
import { usePointsStore } from '@/stores/usePointsStore'
import { NEWS_POSTS } from '@devcon-plus/supabase'
import { XP_NEXT_MILESTONE } from '@/constants/points'

const NEWS_TABS = ['DEVCON', 'TECH COMMUNITY']

export default function DashboardScreen() {
  const router = useRouter()
  const { user, initials } = useAuthStore()
  const { events } = useEventsStore()
  const { jobs } = useJobsStore()
  const { totalPoints, transactions } = usePointsStore()
  const [activeNewsTab, setActiveNewsTab] = useState('DEVCON')

  const forYouEvents = events.slice(0, 3)
  const hotJobs = jobs.slice(0, 3)
  const devconNews = NEWS_POSTS.filter((p) => p.category === 'devcon').slice(0, 2)
  const techNews = NEWS_POSTS.filter((p) => p.category === 'tech_community').slice(0, 2)
  const activeNews = activeNewsTab === 'DEVCON' ? devconNews : techNews
  const recentTransactions = transactions.slice(0, 4)

  const firstName = user?.full_name.split(' ')[0] ?? 'there'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── 1. Blue header ── */}
      <BlueHeader>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeLabel}>Welcome back,</Text>
            <Text style={styles.welcomeName}>Hi, {firstName}! 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* XP Card */}
        <XPCard totalPoints={totalPoints} nextMilestone={XP_NEXT_MILESTONE} />

        {/* CTA button */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push('/(tabs)/events')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>Attend Our Events →</Text>
        </TouchableOpacity>
      </BlueHeader>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── 2. Quick Actions ── */}
        <View style={{ height: 16 }} />
        <View style={styles.qaGrid}>
          <TouchableOpacity style={styles.qaItem} onPress={() => router.push('/(tabs)/jobs')}>
            <View style={styles.qaIconWrap}><Text style={styles.qaIcon}>💼</Text></View>
            <Text style={styles.qaLabel}>Find Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qaItem} onPress={() => router.push('/(tabs)/points')}>
            <View style={styles.qaIconWrap}><Text style={styles.qaIcon}>🤝</Text></View>
            <Text style={styles.qaLabel}>Volunteer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qaItem} onPress={() => router.push('/(tabs)/rewards')}>
            <View style={styles.qaIconWrap}><Text style={styles.qaIcon}>🎁</Text></View>
            <Text style={styles.qaLabel}>Redeem</Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. Events For You ── */}
        <View style={styles.secHdr}>
          <Text style={styles.secTitle}>Events For You</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
            <Text style={styles.secLink}>View All ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.eventsList}>
          {forYouEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onPress={() => router.push(`/(tabs)/events/${event.id}`)}
            />
          ))}
        </View>

        {/* ── 4. Hot Jobs ── */}
        <View style={styles.secHdr}>
          <Text style={styles.secTitle}>Hot Jobs 🔥</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
            <Text style={styles.secLink}>View All ›</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.jobsScroll}
        >
          {hotJobs.map((job) => (
            <JobCardMini
              key={job.id}
              job={job}
              onPress={() => router.push(`/(tabs)/jobs/${job.id}`)}
            />
          ))}
        </ScrollView>

        {/* ── 5 & 6. Updates (News) ── */}
        <View style={[styles.secHdr, { marginTop: 8 }]}>
          <Text style={styles.secTitle}>Updates</Text>
        </View>
        {/* News tab toggle */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.newsTabs}
        >
          {NEWS_TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={[styles.newsTab, activeNewsTab === tab && styles.newsTabActive]}
              onPress={() => setActiveNewsTab(tab)}
            >
              <Text style={[styles.newsTabText, activeNewsTab === tab && styles.newsTabTextActive]}>
                {i + 1}/ {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {activeNews.map((post) => (
          <NewsCard key={post.id} post={post} />
        ))}

        {/* ── 7. XP History preview ── */}
        <View style={styles.secHdr}>
          <Text style={styles.secTitle}>XP History</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/points/history')}>
            <Text style={styles.secLink}>View All ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.txnList}>
          {recentTransactions.map((txn, i) => (
            <TransactionRow
              key={txn.id}
              transaction={txn}
              isLast={i === recentTransactions.length - 1}
            />
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg2 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  ctaBtn: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate900,
  },
  scroll: { flex: 1 },
  qaGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  qaItem: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  qaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.blue10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaIcon: { fontSize: 20 },
  qaLabel: { fontSize: 12, fontWeight: '600', color: Colors.slate700 },
  secHdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  secTitle: { fontSize: 16, fontWeight: '700', color: Colors.slate900 },
  secLink: { fontSize: 13, fontWeight: '600', color: Colors.blue },
  eventsList: { paddingHorizontal: 16 },
  jobsScroll: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
    marginBottom: 4,
  },
  newsTabs: {
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 12,
  },
  newsTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    backgroundColor: Colors.white,
  },
  newsTabActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  newsTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate500,
  },
  newsTabTextActive: {
    color: Colors.white,
  },
  txnList: { paddingHorizontal: 16 },
})
