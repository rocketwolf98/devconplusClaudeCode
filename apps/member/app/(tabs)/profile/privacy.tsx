import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TopBar } from '@/components/TopBar'
import { Colors } from '@/constants/colors'

interface Section {
  title: string
  body: string
}

const SECTIONS: Section[] = [
  {
    title: 'Data We Collect',
    body: 'We collect the information you provide during registration including your name, email address, school or company affiliation, and chapter preference. We also collect usage data such as events you register for, points earned, and rewards redeemed.',
  },
  {
    title: 'How We Use Your Data',
    body: 'Your data is used to operate the DEVCON+ platform — to manage your event registrations, track your XP points, display your profile to chapter organizers, and send you relevant updates about DEVCON Philippines activities.',
  },
  {
    title: 'Data Sharing',
    body: 'We do not sell your personal data. Chapter organizers can view your name and registration status for events in their chapter. Your data is hosted on Supabase servers and protected by industry-standard security measures.',
  },
  {
    title: 'Your Rights',
    body: 'You may request a copy of your data, request corrections, or request deletion of your account by contacting your chapter officer or emailing info@devcon.ph. Account deletion will remove all your points and registration history.',
  },
  {
    title: 'QR Code & Check-in',
    body: 'Your QR code ticket is unique to each event registration. It is used only for check-in verification at the event venue. Scanning your QR code awards you the event attendance points.',
  },
  {
    title: 'Changes to This Policy',
    body: 'We may update this Privacy Policy as the platform evolves. You will be notified of significant changes via the app. Continued use of DEVCON+ constitutes acceptance of any updates.',
  },
  {
    title: 'Contact',
    body: 'For privacy concerns or data requests, contact DEVCON Philippines at info@devcon.ph or reach out to your chapter officer.',
  },
]

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TopBar title="Privacy & Terms" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <Text style={styles.headerMeta}>DEVCON Philippines · Effective February 2026</Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using DEVCON+, you agree to this Privacy Policy and the Terms of Use of the platform.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  header: {
    backgroundColor: Colors.blue,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.white, marginBottom: 4 },
  headerMeta: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  section: {
    marginBottom: 18,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate900,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 13,
    color: Colors.slate500,
    lineHeight: 21,
  },

  footer: {
    backgroundColor: Colors.slate50,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  footerText: { fontSize: 12, color: Colors.slate500, lineHeight: 19, textAlign: 'center' },
})
