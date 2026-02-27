import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import QRCode from 'react-native-qrcode-svg'
import { TopBar } from '@/components/TopBar'
import { Colors } from '@/constants/colors'
import { useEventsStore } from '@/stores/useEventsStore'

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { events, registrations } = useEventsStore()

  const event = events.find((e) => e.id === id)
  const registration = registrations.find((r) => r.event_id === id && r.status === 'approved')

  if (!event || !registration) return null

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'TBA'

  const qrValue = registration.qr_code_token ?? `DCN-TICKET-${registration.id}`
  const ticketRef = qrValue.slice(0, 8).toUpperCase()

  const handleShare = async () => {
    await Share.share({
      message: `My ticket for ${event.title} — Ref: ${ticketRef}`,
    })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TopBar title="My Ticket" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Success header */}
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.successHeading}>You&apos;re In! 🎉</Text>
          <Text style={styles.successSub}>
            Show the QR code at the entrance to check in and earn XP.
          </Text>
        </View>

        {/* Ticket card */}
        <View style={styles.ticketCard}>
          {/* Gradient top half */}
          <View style={styles.ticketTop}>
            <Text style={styles.ticketChapter}>DEVCON Philippines</Text>
            <Text style={styles.ticketTitle} numberOfLines={2}>{event.title}</Text>
            <View style={styles.ticketMeta}>
              <View style={styles.ticketMetaItem}>
                <Text style={styles.ticketMetaLabel}>DATE</Text>
                <Text style={styles.ticketMetaValue}>{formattedDate}</Text>
              </View>
              <View style={styles.ticketMetaDivider} />
              <View style={styles.ticketMetaItem}>
                <Text style={styles.ticketMetaLabel}>LOCATION</Text>
                <Text style={styles.ticketMetaValue} numberOfLines={1}>
                  {event.location ?? 'TBA'}
                </Text>
              </View>
            </View>
          </View>

          {/* Tear line */}
          <View style={styles.tearRow}>
            <View style={styles.tearCircleLeft} />
            <View style={styles.tearLine} />
            <View style={styles.tearCircleRight} />
          </View>

          {/* QR bottom half */}
          <View style={styles.ticketBottom}>
            <View style={styles.qrWrap}>
              <QRCode
                value={qrValue}
                size={130}
                color={Colors.navy}
                backgroundColor={Colors.white}
              />
            </View>
            <Text style={styles.ticketRef}>Ref: {ticketRef}</Text>
            <View style={styles.xpChip}>
              <Text style={styles.xpChipText}>⭐ +{event.points_value} XP on check-in</Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share Ticket</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace('/(tabs)/events')}
        >
          <Text style={styles.doneBtnText}>Back to Events</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  successWrap: { alignItems: 'center', paddingVertical: 24 },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successCheck: { fontSize: 28, color: Colors.white, fontWeight: '900' },
  successHeading: { fontSize: 22, fontWeight: '900', color: Colors.slate900, marginBottom: 6 },
  successSub: {
    fontSize: 13,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },

  ticketCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 10,
    marginBottom: 20,
  },
  ticketTop: {
    backgroundColor: Colors.blue,
    padding: 20,
  },
  ticketChapter: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  ticketTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 26,
    marginBottom: 16,
  },
  ticketMeta: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  ticketMetaItem: { flex: 1 },
  ticketMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 3,
  },
  ticketMetaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  ticketMetaDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 2,
  },

  tearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  tearCircleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8F1FB',
    marginLeft: -10,
  },
  tearLine: {
    flex: 1,
    borderTopWidth: 2,
    borderTopColor: Colors.slate200,
    borderStyle: 'dashed',
    marginHorizontal: 4,
  },
  tearCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8F1FB',
    marginRight: -10,
  },

  ticketBottom: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    gap: 10,
  },
  qrWrap: {
    padding: 10,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  ticketRef: {
    fontFamily: 'monospace' as const,
    fontSize: 11,
    color: Colors.slate400,
    letterSpacing: 1,
  },
  xpChip: {
    backgroundColor: Colors.green10,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(33,196,93,0.3)',
  },
  xpChipText: { fontSize: 11, fontWeight: '700', color: '#166534' },

  shareBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 30,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  doneBtn: {
    borderWidth: 1.5,
    borderColor: Colors.slate300,
    borderRadius: 30,
    paddingVertical: 13,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: 14, fontWeight: '600', color: Colors.slate700 },
})
