import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'
import { useRouter } from 'expo-router'

interface TopBarProps {
  title: string
  onBack?: () => void
  rightElement?: React.ReactNode
}

export function TopBar({ title, onBack, rightElement }: TopBarProps) {
  const router = useRouter()

  const handleBack = onBack ?? (() => router.back())

  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>
        {rightElement ?? <View style={styles.placeholder} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    backgroundColor: Colors.white,
  },
  backBtn: {
    flexShrink: 0,
  },
  backArrow: {
    fontSize: 20,
    color: Colors.blue,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.slate900,
  },
  right: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 36,
  },
})
