import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BlueHeader } from '@/components/BlueHeader'
import { ComingSoonModal } from '@/components/ComingSoonModal'
import { Colors } from '@/constants/colors'
import { useAuthStore } from '@/stores/useAuthStore'
import { usePointsStore } from '@/stores/usePointsStore'

const THEMES = [
  { id: 'ocean', label: 'Ocean', colors: ['#3B5BDE', '#6B48FF'] },
  { id: 'forest', label: 'Forest', colors: ['#21C45D', '#059669'] },
  { id: 'sunset', label: 'Sunset', colors: ['#F97316', '#EF4444'] },
  { id: 'midnight', label: 'Midnight', colors: ['#1E2A56', '#0F172A'] },
]

const MENU_ITEMS = [
  { id: 'edit', icon: '✏️', label: 'Edit Profile', route: '/(tabs)/profile/edit' },
  { id: 'notifications', icon: '🔔', label: 'Notification Settings', route: '/(tabs)/profile/notifications' },
  { id: 'privacy', icon: '🔒', label: 'Privacy & Terms', route: '/(tabs)/profile/privacy' },
  { id: 'about', icon: 'ℹ️', label: 'About DEVCON+', route: null },
  { id: 'signout', icon: '🚪', label: 'Sign Out', route: null, danger: true },
]

export default function ProfileScreen() {
  const router = useRouter()
  const { user, initials, signOut } = useAuthStore()
  const { totalPoints } = usePointsStore()
  const [showModal, setShowModal] = useState(false)
  const [activeTheme, setActiveTheme] = useState('ocean')

  if (!user) return null

  const handleMenuPress = (item: typeof MENU_ITEMS[0]) => {
    if (item.id === 'signout') {
      signOut()
      router.replace('/(auth)/sign-in')
      return
    }
    if (item.route) {
      router.push(item.route as never)
      return
    }
    setShowModal(true)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BlueHeader>
        {/* Avatar */}
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.name}>{user.full_name}</Text>
            <Text style={styles.school}>{user.school_or_company}</Text>
            <View style={styles.xpPill}>
              <Text style={styles.xpPillText}>⭐ {totalPoints.toLocaleString()} XP · Manila Chapter</Text>
            </View>
          </View>
        </View>
      </BlueHeader>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Theme selector */}
        <Text style={styles.sectionLabel}>App Theme</Text>
        <View style={styles.themeGrid}>
          {THEMES.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeCard,
                activeTheme === theme.id && styles.themeCardActive,
              ]}
              onPress={() => setActiveTheme(theme.id)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.themeColor,
                  { backgroundColor: theme.colors[0] },
                ]}
              />
              <Text style={styles.themeLabel}>{theme.label}</Text>
              {activeTheme === theme.id && (
                <View style={styles.themeCheck}>
                  <Text style={styles.themeCheckText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Menu */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                idx < MENU_ITEMS.length - 1 && styles.menuItemBorder,
              ]}
              onPress={() => handleMenuPress(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                {item.label}
              </Text>
              {!item.danger && <Text style={styles.menuChevron}>›</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.version}>DEVCON+ v1.0.0 · Made with ❤️ in the Philippines</Text>
      </ScrollView>

      <ComingSoonModal visible={showModal} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 24, fontWeight: '900', color: Colors.white },
  avatarInfo: { flex: 1, gap: 3 },
  name: { fontSize: 19, fontWeight: '900', color: Colors.white },
  school: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  xpPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  xpPillText: { fontSize: 11, fontWeight: '700', color: Colors.white },

  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.slate400,
    marginBottom: 10,
    marginTop: 8,
  },

  themeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  themeCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    padding: 8,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  themeCardActive: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blue10,
  },
  themeColor: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  themeLabel: { fontSize: 10, fontWeight: '600', color: Colors.slate500 },
  themeCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCheckText: { fontSize: 9, color: Colors.white, fontWeight: '700' },

  menuList: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  menuIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.slate900 },
  menuLabelDanger: { color: Colors.red },
  menuChevron: { fontSize: 20, color: Colors.slate300 },

  version: {
    fontSize: 11,
    color: Colors.slate300,
    textAlign: 'center',
    marginTop: 8,
  },
})
