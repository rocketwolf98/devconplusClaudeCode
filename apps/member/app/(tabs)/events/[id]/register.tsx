import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TopBar } from '@/components/TopBar'
import { Colors } from '@/constants/colors'
import { useAuthStore } from '@/stores/useAuthStore'
import { useEventsStore } from '@/stores/useEventsStore'

export default function RegisterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const { events, register } = useEventsStore()
  const event = events.find((e) => e.id === id)

  // Pre-fill from authenticated user profile (CLAUDE.md Rule #5)
  const [name, setName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [school, setSchool] = useState(user?.school_or_company ?? '')
  const [tcAgreed, setTcAgreed] = useState(true)
  const [privacyAgreed, setPrivacyAgreed] = useState(true)

  const handleApply = () => {
    if (!id) return
    register(id)
    if (event?.requires_approval) {
      router.replace(`/(tabs)/events/${id}/pending`)
    } else {
      router.replace(`/(tabs)/events/${id}/ticket`)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar title="Registration" onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Your Info</Text>

        {/* Pill-style inputs (matching prototype registration form) */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Name <Text style={styles.req}>*</Text></Text>
          <TextInput
            style={styles.pillInput}
            value={name}
            onChangeText={setName}
            placeholder="Your Name"
            placeholderTextColor={Colors.slate400}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Email <Text style={styles.req}>*</Text></Text>
          <TextInput
            style={styles.pillInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Youremail@gmail.com"
            placeholderTextColor={Colors.slate400}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>School/Company <Text style={styles.req}>*</Text></Text>
          <TextInput
            style={styles.pillInput}
            value={school}
            onChangeText={setSchool}
            placeholder="School/Company"
            placeholderTextColor={Colors.slate400}
          />
        </View>

        {/* Custom checkboxes */}
        <TouchableOpacity style={styles.checkRow} onPress={() => setTcAgreed(!tcAgreed)}>
          <View style={[styles.checkbox, tcAgreed && styles.checkboxChecked]}>
            {tcAgreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>
            By joining this event, you agree to{' '}
            <Text style={styles.checkLink}>Terms and Conditions.</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setPrivacyAgreed(!privacyAgreed)}
        >
          <View style={[styles.checkbox, privacyAgreed && styles.checkboxChecked]}>
            {privacyAgreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>
            By joining this event, you agree to join{' '}
            <Text style={styles.checkLink}>DEVCON+ XYZ.</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.applyBtn, (!tcAgreed || !privacyAgreed) && styles.applyBtnDisabled]}
          onPress={handleApply}
          disabled={!tcAgreed || !privacyAgreed}
        >
          <Text style={styles.applyBtnText}>Apply Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.slate900, marginBottom: 18 },
  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.slate700, marginBottom: 6 },
  req: { color: Colors.red },
  pillInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 13,
    fontSize: 14,
    color: Colors.slate900,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  checkmark: { fontSize: 11, color: Colors.white, fontWeight: '700' },
  checkLabel: { flex: 1, fontSize: 13, color: Colors.slate500, lineHeight: 19, paddingTop: 1 },
  checkLink: { color: Colors.blue, fontWeight: '600' },
  applyBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  applyBtnDisabled: { opacity: 0.5 },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
})
