import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BlueHeader } from '@/components/BlueHeader'
import { EventRow } from '@/components/EventRow'
import { ChipBar } from '@/components/ChipBar'
import { Colors } from '@/constants/colors'
import { useEventsStore } from '@/stores/useEventsStore'

const DISCOVER_TABS = ['Discover', 'My Tickets']
const FILTER_CHIPS = ['All', 'DEVCON+ Exclusive', 'Campus DEVCON', 'DEVCON Kids', '#SheIsDEVCON']

export default function EventsScreen() {
  const router = useRouter()
  const { events, registrations } = useEventsStore()
  const [activeTab, setActiveTab] = useState('Discover')
  const [activeFilter, setActiveFilter] = useState('All')

  const featuredEvent = events.find((e) => e.is_featured) ?? events[0]
  const listEvents = events.filter((e) => e.id !== featuredEvent?.id)
  const myTickets = events.filter((e) =>
    registrations.some((r) => r.event_id === e.id)
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BlueHeader paddingBottom={16}>
        <View style={styles.hdrRow}>
          <Text style={styles.hdrTitle}>Events</Text>
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
      </BlueHeader>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Discover / My Tickets toggle */}
        <View style={styles.toggleWrap}>
          {DISCOVER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.toggleTab, activeTab === tab && styles.toggleTabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.toggleText, activeTab === tab && styles.toggleTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'Discover' ? (
          <>
            {/* Featured event banner */}
            {featuredEvent && (
              <TouchableOpacity
                style={styles.featuredBanner}
                onPress={() => router.push(`/(tabs)/events/${featuredEvent.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.featuredOverlay} />
                <View style={styles.featuredContent}>
                  <View style={styles.featuredTag}>
                    <Text style={styles.featuredTagIcon}>📈</Text>
                    <Text style={styles.featuredTagText}>RECOMMENDED</Text>
                  </View>
                  <Text style={styles.featuredTitle}>{featuredEvent.title}</Text>
                  <Text style={styles.featuredMeta}>
                    📅 {featuredEvent.event_date
                      ? new Date(featuredEvent.event_date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })
                      : 'TBA'}{' '}
                    &nbsp;📍 {featuredEvent.location ?? 'TBA'}
                  </Text>
                  <TouchableOpacity
                    style={styles.rsvpBtn}
                    onPress={() => router.push(`/(tabs)/events/${featuredEvent.id}`)}
                  >
                    <Text style={styles.rsvpBtnText}>RSVP Now</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}

            {/* Filter chips */}
            <ChipBar
              chips={FILTER_CHIPS}
              activeChip={activeFilter}
              onSelect={setActiveFilter}
            />
            <View style={{ height: 14 }} />

            {/* Event list */}
            <View style={styles.list}>
              {listEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.list}>
            {myTickets.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎟️</Text>
                <Text style={styles.emptyTitle}>No tickets yet</Text>
                <Text style={styles.emptyDesc}>Register for events to see your tickets here.</Text>
              </View>
            ) : (
              myTickets.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                />
              ))
            )}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg2 },
  hdrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hdrTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  searchIcon: { fontSize: 20, color: 'rgba(255,255,255,0.8)' },
  toggleWrap: {
    flexDirection: 'row',
    margin: 16,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  toggleTabActive: { backgroundColor: Colors.blue },
  toggleText: { fontSize: 13, fontWeight: '600', color: Colors.slate400 },
  toggleTextActive: { color: Colors.white },
  featuredBanner: {
    margin: 16,
    marginTop: 0,
    backgroundColor: Colors.navy,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
    minHeight: 160,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,20,80,0.6)',
  },
  featuredContent: { position: 'relative', zIndex: 1 },
  featuredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  featuredTagIcon: { fontSize: 14 },
  featuredTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 6,
  },
  featuredMeta: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 3 },
  rsvpBtn: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  rsvpBtnText: { fontSize: 13, fontWeight: '700', color: Colors.slate900 },
  list: { paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.slate900 },
  emptyDesc: { fontSize: 14, color: Colors.slate500, textAlign: 'center' },
})
