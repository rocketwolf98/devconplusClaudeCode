import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'
import type { Event } from '@devcon-plus/supabase'

interface EventRowProps {
  event: Event
  onPress: () => void
}

function formatDate(dateStr: string | null): { mon: string; day: string } {
  if (!dateStr) return { mon: '???', day: '?' }
  const d = new Date(dateStr)
  return {
    mon: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
  }
}

export function EventRow({ event, onPress }: EventRowProps) {
  const { mon, day } = formatDate(event.event_date)

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.dateBadge}>
        <Text style={styles.dateMon}>{mon}</Text>
        <Text style={styles.dateDay}>{day}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>{event.location}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  dateBadge: {
    width: 44,
    flexShrink: 0,
    alignItems: 'center',
    backgroundColor: Colors.blue10,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  dateMon: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.blue,
    textTransform: 'uppercase',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.blue,
    lineHeight: 22,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.slate900,
  },
  meta: {
    fontSize: 12,
    color: Colors.slate400,
    marginTop: 2,
  },
  arrow: {
    fontSize: 16,
    color: Colors.slate300,
  },
})
