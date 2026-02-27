import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TopBar } from '@/components/TopBar'
import { Colors } from '@/constants/colors'

interface NotifSetting {
  id: string
  icon: string
  label: string
  desc: string
}

const SETTINGS: NotifSetting[] = [
  { id: 'event_reminders', icon: '📅', label: 'Event Reminders', desc: 'Get reminded before events you\'ve registered for' },
  { id: 'event_updates', icon: '🔔', label: 'Event Updates', desc: 'Receive updates when event details change' },
  { id: 'registration_status', icon: '✅', label: 'Registration Status', desc: 'Know when your registration is approved or rejected' },
  { id: 'new_jobs', icon: '💼', label: 'New Job Listings', desc: 'Be first to know about new opportunities' },
  { id: 'xp_milestones', icon: '⭐', label: 'XP Milestones', desc: 'Celebrate when you hit a new XP level' },
  { id: 'chapter_news', icon: '📣', label: 'Chapter News', desc: 'Updates from your Manila chapter' },
]

export default function NotificationsScreen() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    event_reminders: true,
    event_updates: true,
    registration_status: true,
    new_jobs: false,
    xp_milestones: true,
    chapter_news: true,
  })

  const toggle = (id: string) => {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TopBar title="Notification Settings" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>
          Push notifications will be available in a future update. Configure your preferences now.
        </Text>

        <View style={styles.list}>
          {SETTINGS.map((s, idx) => (
            <View
              key={s.id}
              style={[styles.row, idx < SETTINGS.length - 1 && styles.rowBorder]}
            >
              <View style={styles.rowIcon}>
                <Text style={styles.icon}>{s.icon}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.label}>{s.label}</Text>
                <Text style={styles.desc}>{s.desc}</Text>
              </View>
              <Switch
                value={enabled[s.id]}
                onValueChange={() => toggle(s.id)}
                trackColor={{ false: Colors.slate200, true: Colors.blue }}
                thumbColor={Colors.white}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  hint: {
    fontSize: 13,
    color: Colors.slate500,
    lineHeight: 20,
    marginBottom: 16,
    backgroundColor: Colors.blue10,
    borderRadius: 10,
    padding: 12,
  },

  list: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.blue10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 16 },
  rowInfo: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.slate900, marginBottom: 2 },
  desc: { fontSize: 11, color: Colors.slate400, lineHeight: 16 },
})
