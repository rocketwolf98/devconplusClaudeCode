import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import { useAuthStore } from '@/stores/useAuthStore'

export default function SignInScreen() {
  const router = useRouter()
  const { signIn, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)

  const handleSignIn = async () => {
    await signIn(email, password)
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Blue header section */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>D+</Text>
        </View>
        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subHeading}>Sign in to your DEVCON+ account</Text>
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Google OAuth — no Apple per CLAUDE.md Rule #1 */}
        <TouchableOpacity style={styles.socialBtn} onPress={handleSignIn}>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.socialBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign in with email</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>EMAIL</Text>
          <TextInput
            style={[styles.input, emailFocused && styles.inputFocused]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor={Colors.slate400}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>PASSWORD</Text>
          <TextInput
            style={[styles.input, passFocused && styles.inputFocused]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={Colors.slate400}
            secureTextEntry
            onFocus={() => setPassFocused(true)}
            onBlur={() => setPassFocused(false)}
          />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.switchText}>
          Don&apos;t have an account?{' '}
          <Text style={styles.switchLink} onPress={() => router.push('/(auth)/sign-up')}>
            Create one
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
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
    marginBottom: 16,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
  },
  subHeading: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 24,
    gap: 14,
  },
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
  socialBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate900,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.slate200,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.slate400,
  },
  inputWrap: {
    gap: 5,
  },
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
  inputFocused: {
    borderColor: Colors.blue,
    backgroundColor: Colors.white,
  },
  primaryBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  switchText: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.slate500,
  },
  switchLink: {
    color: Colors.blue,
    fontWeight: '700',
  },
})
