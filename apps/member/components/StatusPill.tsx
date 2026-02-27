import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'
import type { RegistrationStatus } from '@devcon-plus/supabase'

type StatusVariant = RegistrationStatus | 'open' | 'youre_in'

interface StatusPillProps {
  status: StatusVariant
}

const STATUS_CONFIG: Record<
  StatusVariant,
  { label: string; bg: string; text: string; border: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'rgba(245,158,11,0.10)',
    text: '#92400E',
    border: 'rgba(245,158,11,0.30)',
  },
  approved: {
    label: 'Approved',
    bg: Colors.green10,
    text: '#166534',
    border: 'rgba(33,196,93,0.30)',
  },
  rejected: {
    label: 'Rejected',
    bg: Colors.red10,
    text: '#991B1B',
    border: 'rgba(239,68,68,0.30)',
  },
  open: {
    label: 'Open',
    bg: Colors.blue10,
    text: Colors.blue,
    border: 'rgba(59,91,222,0.25)',
  },
  youre_in: {
    label: "You're In!",
    bg: Colors.green10,
    text: '#166534',
    border: 'rgba(33,196,93,0.30)',
  },
}

export function StatusPill({ status }: StatusPillProps) {
  const config = STATUS_CONFIG[status]
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
})
