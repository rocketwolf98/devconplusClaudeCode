import React from 'react'
import {
  View,
  Text,
  SectionList,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BlueHeader } from '@/components/BlueHeader'
import { XPCard } from '@/components/XPCard'
import { TransactionRow } from '@/components/TransactionRow'
import { Colors } from '@/constants/colors'
import { usePointsStore } from '@/stores/usePointsStore'
import type { PointTransaction } from '@devcon-plus/supabase'

interface Section {
  title: string
  data: PointTransaction[]
}

function groupTransactions(transactions: PointTransaction[]): Section[] {
  const now = new Date('2026-02-25T00:00:00Z') // match mock current date
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)

  const today: PointTransaction[] = []
  const thisWeek: PointTransaction[] = []
  const earlier: PointTransaction[] = []

  for (const txn of transactions) {
    const date = new Date(txn.created_at)
    if (date >= todayStart) {
      today.push(txn)
    } else if (date >= weekStart) {
      thisWeek.push(txn)
    } else {
      earlier.push(txn)
    }
  }

  const sections: Section[] = []
  if (today.length > 0) sections.push({ title: 'Today', data: today })
  if (thisWeek.length > 0) sections.push({ title: 'This Week', data: thisWeek })
  if (earlier.length > 0) sections.push({ title: 'Earlier', data: earlier })
  return sections
}

export default function PointsHistoryScreen() {
  const { totalPoints, transactions } = usePointsStore()
  const sections = groupTransactions(transactions)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BlueHeader>
        <Text style={styles.headerTitle}>XP History</Text>
        <XPCard totalPoints={totalPoints} />
      </BlueHeader>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHdr}>
            <Text style={styles.sectionHdrText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <TransactionRow transaction={item} />
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>That&apos;s it!</Text>
            <Text style={styles.footerSub}>You&apos;ve seen all your XP activity.</Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 14,
  },
  content: { paddingBottom: 32 },

  sectionHdr: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHdrText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.slate400,
  },

  rowWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    overflow: 'hidden',
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  footerText: { fontSize: 15, fontWeight: '700', color: Colors.slate400 },
  footerSub: { fontSize: 12, color: Colors.slate300 },
})
