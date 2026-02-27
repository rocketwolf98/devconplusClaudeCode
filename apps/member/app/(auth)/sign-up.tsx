import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import { useAuthStore } from '@/stores/useAuthStore'

export default function SignUpScreen() {
  const router = useRouter()
  const { signIn } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [school, setSchool] = useState('')
  const [orgGateVisible, setOrgGateVisible] = useState(false)
  const [orgCode, setOrgCode] = useState('')

  const handleCreateAccount = () => {
    if (!orgGateVisible) {
      setOrgGateVisible(true)
      return
    }
    // TODO: validate organizer code if entered, else create as member
    signIn(email, password).then(() => {
      router.replace('/(tabs)')
    })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>D+</Text>
        </View>
        <Text style={styles.heading}>Join DEVCON+</Text>
        <Text style={styles.subHeading}>Join 60,000+ Filipino tech builders</Text>
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Google OAuth — no Apple per CLAUDE.md Rule #1 */}
        <TouchableOpacity style={styles.socialBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.socialBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Juan dela Cruz"
            placeholderTextColor={Colors.slate400}
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor={Colors.slate400}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={Colors.slate400}
            secureTextEntry
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>SCHOOL / COMPANY</Text>
          <TextInput
            style={styles.input}
            value={school}
            onChangeText={setSchool}
            placeholder="e.g. PLM, Accenture"
            placeholderTextColor={Colors.slate400}
          />
        </View>

        {/* Organizer Gate — revealed after first tap */}
        {orgGateVisible && (
          <View style={styles.orgGate}>
            <Text style={styles.orgGateTitle}>🔐 DO YOU HAVE AN ORGANIZER CODE?</Text>
            <Text style={styles.orgGateDesc}>
              Chapter Officers & HQ Admins — enter your code to unlock organizer tools, event
              management, and separate organizer XP.
            </Text>
            <TextInput
              style={styles.input}
              value={orgCode}
              onChangeText={setOrgCode}
              placeholder="Organizer code (optional)"
              placeholderTextColor={Colors.slate400}
              autoCapitalize="characters"
            />
            <View style={styles.orgBtns}>
              <TouchableOpacity
                style={[styles.btn, styles.btnBlue, styles.flex1]}
                onPress={() => router.replace('/(tabs)')}
              >
                <Text style={styles.btnBlueText}>Join as Organizer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline, styles.flex1]}
                onPress={() => router.replace('/(tabs)')}
              >
                <Text style={styles.btnOutlineText}>Skip → Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!orgGateVisible && (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateAccount}>
            <Text style={styles.primaryBtnText}>Create Account</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.switchText}>
          Already have an account?{' '}
          <Text style={styles.switchLink} onPress={() => router.push('/(auth)/sign-in')}>
            Sign In
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 28,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.blue,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  logoText: { fontSize: 24, fontWeight: '900', color: Colors.white },
  heading: { fontSize: 22, fontWeight: '800', color: Colors.white },
  subHeading: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  form: { flex: 1 },
  formContent: { padding: 20, gap: 10 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 8,
    backgroundColor: Colors.white,
    marginBottom: 4,
  },
  googleIcon: {
    width: 22,
    height: 22,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.blue,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.blue,
  },
  socialBtnText: { fontSize: 14, fontWeight: '600', color: Colors.slate900 },
  inputWrap: { gap: 5 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.slate900,
  },
  orgGate: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: Colors.blue,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  orgGateTitle: { fontSize: 13, fontWeight: '800', color: Colors.blue },
  orgGateDesc: { fontSize: 12, color: Colors.slate500, lineHeight: 17 },
  orgBtns: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  btn: { paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  btnBlue: { backgroundColor: Colors.blue },
  btnBlueText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  btnOutline: { borderWidth: 1.5, borderColor: Colors.slate300 },
  btnOutlineText: { fontSize: 12, fontWeight: '700', color: Colors.slate700 },
  primaryBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  switchText: { textAlign: 'center', fontSize: 13, color: Colors.slate500 },
  switchLink: { color: Colors.blue, fontWeight: '700' },
})
