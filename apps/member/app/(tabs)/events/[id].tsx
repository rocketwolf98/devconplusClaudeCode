import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TopBar } from '@/components/TopBar'
import { Colors } from '@/constants/colors'
import { useEventsStore } from '@/stores/useEventsStore'

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { events, registrations } = useEventsStore()

  const event = events.find((e) => e.id === id)
  if (!event) return null

  const registration = registrations.find((r) => r.event_id === id)
  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'TBA'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar title="Registration" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Event banner */}
        <View style={styles.bannerWrap}>
          {event.cover_image_url ? (
            <Image source={{ uri: event.cover_image_url }} style={styles.bannerImg} />
          ) : (
            <View style={[styles.bannerImg, styles.bannerPlaceholder]}>
              <Text style={styles.bannerEmoji}>🎮</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.hostedBy}>EVENT TITLE</Text>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.host}>Hosted by DEVCON Philippines</Text>

          {/* Date row */}
          <View style={styles.metaRow}>
            <View style={styles.metaIcon}><Text>📅</Text></View>
            <View>
              <Text style={styles.metaMain}>{formattedDate}</Text>
              <Text style={styles.metaSub}>9:00 AM – 6:00 PM</Text>
            </View>
          </View>

          {/* Location row */}
          <View style={styles.metaRow}>
            <View style={styles.metaIcon}><Text>📍</Text></View>
            <Text style={[styles.metaMain, { color: Colors.blue }]}>
              {registration ? event.location ?? 'TBA' : 'Register to See Address'}
            </Text>
          </View>

          {/* Registration box */}
          <View style={styles.regBox}>
            <View style={styles.regBoxHdr}>
              <Text style={styles.regBoxHdrText}>Registration</Text>
            </View>
            <View style={styles.regBoxBody}>
              {event.requires_approval && (
                <View style={styles.approvalNotice}>
                  <View style={styles.approvalIcon}><Text>ℹ️</Text></View>
                  <View>
                    <Text style={styles.approvalTitle}>Approval Required</Text>
                    <Text style={styles.approvalDesc}>
                      Your registration is subject to approval by the host.
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.regDivider} />
              <Text style={styles.regWelcome}>Welcome! To join this event, please register below.</Text>
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => router.push(`/(tabs)/events/${id}/register`)}
              >
                <Text style={styles.joinBtnText}>Request to Join</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* About */}
          <Text style={styles.aboutTitle}>About Event</Text>
          <Text style={styles.aboutBody}>{event.description}</Text>

          {/* XP reward */}
          <View style={styles.xpChip}>
            <Text style={styles.xpChipText}>⭐ +{event.points_value} XP on check-in</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },
  content: { paddingBottom: 32 },
  bannerWrap: {
    margin: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  bannerImg: { width: '100%', height: 180 },
  bannerPlaceholder: {
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: { fontSize: 48 },
  body: { paddingHorizontal: 16 },
  hostedBy: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: Colors.slate400,
    marginBottom: 6,
  },
  title: { fontSize: 20, fontWeight: '900', color: Colors.slate900, marginBottom: 3 },
  host: { fontSize: 13, color: Colors.slate400, marginBottom: 16 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  metaIcon: {
    width: 32,
    height: 32,
    backgroundColor: Colors.blue10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metaMain: { fontSize: 14, fontWeight: '700', color: Colors.slate900 },
  metaSub: { fontSize: 12, color: Colors.slate400, marginTop: 1 },
  regBox: {
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    marginTop: 16,
    marginBottom: 16,
  },
  regBoxHdr: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.slate50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  regBoxHdrText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  regBoxBody: { padding: 14 },
  approvalNotice: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  approvalIcon: {
    width: 32,
    height: 32,
    backgroundColor: Colors.blue10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  approvalTitle: { fontSize: 14, fontWeight: '700', color: Colors.slate900 },
  approvalDesc: { fontSize: 12, color: Colors.slate400, marginTop: 2, lineHeight: 17 },
  regDivider: { height: 1, backgroundColor: Colors.slate100, marginBottom: 12 },
  regWelcome: { fontSize: 13, color: Colors.slate500, marginBottom: 14 },
  joinBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 30,
    paddingVertical: 13,
    alignItems: 'center',
  },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  aboutTitle: { fontSize: 16, fontWeight: '800', color: Colors.blue, marginBottom: 8 },
  aboutBody: { fontSize: 13, color: Colors.slate500, lineHeight: 22 },
  xpChip: {
    marginTop: 16,
    backgroundColor: Colors.green10,
    borderWidth: 1,
    borderColor: 'rgba(33,196,93,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  xpChipText: { fontSize: 12, fontWeight: '700', color: '#166534' },
})
