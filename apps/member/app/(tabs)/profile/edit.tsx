import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TopBar } from '@/components/TopBar'
import { Colors } from '@/constants/colors'
import { useAuthStore } from '@/stores/useAuthStore'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  school_or_company: z.string().min(1, 'School or company is required'),
})

type FormData = z.infer<typeof schema>

export default function EditProfileScreen() {
  const router = useRouter()
  const { user, initials } = useAuthStore()

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user?.full_name ?? '',
      school_or_company: user?.school_or_company ?? '',
    },
  })

  const onSubmit = (_data: FormData) => {
    // TODO: update profile via Supabase
    router.back()
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TopBar title="Edit Profile" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.avatarHint}>Avatar editing coming soon</Text>
        </View>

        {/* Full name */}
        <Text style={styles.label}>FULL NAME</Text>
        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.full_name && styles.inputError]}
              value={value}
              onChangeText={onChange}
              placeholder="Your full name"
              placeholderTextColor={Colors.slate300}
            />
          )}
        />
        {errors.full_name && (
          <Text style={styles.errorText}>{errors.full_name.message}</Text>
        )}

        {/* Email (read-only) */}
        <Text style={styles.label}>EMAIL</Text>
        <View style={[styles.input, styles.inputDisabled]}>
          <Text style={styles.inputDisabledText}>{user?.email}</Text>
        </View>
        <Text style={styles.hint}>Email cannot be changed here.</Text>

        {/* School / Company */}
        <Text style={styles.label}>SCHOOL OR COMPANY</Text>
        <Controller
          control={control}
          name="school_or_company"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.school_or_company && styles.inputError]}
              value={value}
              onChangeText={onChange}
              placeholder="Your school or company"
              placeholderTextColor={Colors.slate300}
            />
          )}
        />
        {errors.school_or_company && (
          <Text style={styles.errorText}>{errors.school_or_company.message}</Text>
        )}

        {/* Chapter (read-only) */}
        <Text style={styles.label}>CHAPTER</Text>
        <View style={[styles.input, styles.inputDisabled]}>
          <Text style={styles.inputDisabledText}>Manila</Text>
        </View>
        <Text style={styles.hint}>Contact your chapter officer to change chapters.</Text>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSubmit(onSubmit)}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  avatarWrap: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.blue20,
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: Colors.white },
  avatarHint: { fontSize: 12, color: Colors.slate400 },

  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Colors.slate500,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.slate900,
  },
  inputError: { borderColor: Colors.red },
  inputDisabled: {
    backgroundColor: Colors.slate50,
    justifyContent: 'center',
  },
  inputDisabledText: { fontSize: 14, color: Colors.slate400 },
  errorText: { fontSize: 12, color: Colors.red, marginTop: 4 },
  hint: { fontSize: 11, color: Colors.slate400, marginTop: 4 },

  saveBtn: {
    marginTop: 28,
    backgroundColor: Colors.blue,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
})
