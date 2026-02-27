import React from 'react'
import { Tabs } from 'expo-router'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'

// Custom bottom tab bar matching the prototype exactly:
// [Home] [Rewards] [● Events ●] [Jobs] [Profile]
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const TAB_CONFIG = [
    { key: 'index', icon: '🏠', label: 'Home' },
    { key: 'rewards', icon: '🎁', label: 'Rewards' },
    { key: 'events', icon: null, label: null }, // center Events button
    { key: 'jobs', icon: '💼', label: 'Jobs' },
    { key: 'profile', icon: '👤', label: 'Profile' },
  ]

  return (
    <View style={styles.navBar}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index
        const config = TAB_CONFIG[index]
        if (!config) return null
        const isCenter = index === 2

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        if (isCenter) {
          return (
            <TouchableOpacity key={route.key} style={styles.navItem} onPress={onPress} activeOpacity={0.85}>
              <View style={[styles.centerBtn, isFocused && styles.centerBtnActive]}>
                <Text style={styles.centerBtnIcon}>⊞</Text>
              </View>
            </TouchableOpacity>
          )
        }

        return (
          <TouchableOpacity key={route.key} style={styles.navItem} onPress={onPress} activeOpacity={0.85}>
            <Text style={styles.navIcon}>{config.icon}</Text>
            <Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>
              {config.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="rewards" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="jobs" />
      <Tabs.Screen name="profile" />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate200,
    paddingBottom: 6,
    paddingTop: 10,
    zIndex: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    position: 'relative',
  },
  navIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.slate400,
  },
  navLabelActive: {
    color: Colors.blue,
  },
  centerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  centerBtnActive: {
    backgroundColor: Colors.blueDark,
  },
  centerBtnIcon: {
    fontSize: 22,
    color: Colors.white,
  },
})
