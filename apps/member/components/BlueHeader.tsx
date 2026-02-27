import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'

interface BlueHeaderProps {
  children: React.ReactNode
  paddingBottom?: number
}

export function BlueHeader({ children, paddingBottom = 24 }: BlueHeaderProps) {
  return (
    <View style={[styles.container, { paddingBottom }]}>
      {/* Decorative circles matching prototype */}
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />
      <View style={styles.inner}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    flexShrink: 0,
  },
  circleTopRight: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -80,
    left: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inner: {
    position: 'relative',
    zIndex: 1,
  },
})
