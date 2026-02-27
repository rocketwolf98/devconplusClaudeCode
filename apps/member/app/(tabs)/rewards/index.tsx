import React, { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BlueHeader } from '@/components/BlueHeader'
import { RewardCard } from '@/components/RewardCard'
import { ComingSoonModal } from '@/components/ComingSoonModal'
import { Colors } from '@/constants/colors'
import { usePointsStore } from '@/stores/usePointsStore'
import { REWARDS } from '@devcon-plus/supabase'
import type { Reward } from '@devcon-plus/supabase'

export default function RewardsScreen() {
  const { totalPoints } = usePointsStore()
  const [showModal, setShowModal] = useState(false)

  const renderItem = ({ item, index }: { item: Reward; index: number }) => (
    <View style={[styles.cardWrap, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}>
      <RewardCard reward={item} onPress={() => setShowModal(true)} />
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BlueHeader>
        <Text style={styles.headerLabel}>Rewards Store</Text>
        <Text style={styles.headerTitle}>Your Balance</Text>
        <View style={styles.balanceRow}>
          <Text style={styles.star}>⭐</Text>
          <Text style={styles.balance}>{totalPoints.toLocaleString()}</Text>
          <Text style={styles.xpLabel}> XP</Text>
        </View>
        <Text style={styles.headerSub}>
          Redeem your points for exclusive DEVCON merch and perks.
        </Text>
      </BlueHeader>

      <FlatList
        data={REWARDS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.comingSoonBanner}>
            <Text style={styles.comingSoonIcon}>🔜</Text>
            <Text style={styles.comingSoonText}>
              Redemptions launching soon! Earn XP now to be first in line.
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 32 }} />}
      />

      <ComingSoonModal visible={showModal} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },

  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  star: { fontSize: 22, marginRight: 4 },
  balance: { fontSize: 36, fontWeight: '900', color: Colors.white },
  xpLabel: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
    maxWidth: 260,
  },

  comingSoonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.gold20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,198,48,0.4)',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    padding: 12,
  },
  comingSoonIcon: { fontSize: 20 },
  comingSoonText: { flex: 1, fontSize: 12, color: '#92620A', lineHeight: 18 },

  grid: { paddingHorizontal: 10 },
  cardWrap: { flex: 1, margin: 6 },
  cardLeft: {},
  cardRight: {},
})
