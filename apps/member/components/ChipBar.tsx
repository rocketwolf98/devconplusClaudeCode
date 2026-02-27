import React from 'react'
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'

interface ChipBarProps {
  chips: string[]
  activeChip: string
  onSelect: (chip: string) => void
}

export function ChipBar({ chips, activeChip, onSelect }: ChipBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {chips.map((chip) => {
        const isActive = chip === activeChip
        return (
          <TouchableOpacity
            key={chip}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(chip)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {chip}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate500,
  },
  chipTextActive: {
    color: Colors.white,
  },
})
