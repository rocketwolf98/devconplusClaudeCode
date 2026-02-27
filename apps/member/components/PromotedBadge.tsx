import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'

export function PromotedBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>PROMOTED</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.promoted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
