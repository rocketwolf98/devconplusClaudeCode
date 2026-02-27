import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'
import type { PointTransaction } from '@devcon-plus/supabase'

interface TransactionRowProps {
  transaction: PointTransaction
  isLast?: boolean
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

export function TransactionRow({ transaction, isLast = false }: TransactionRowProps) {
  const isPositive = transaction.amount > 0
  const absAmount = Math.abs(transaction.amount)

  return (
    <View style={[styles.row, isLast && styles.lastRow]}>
      <View style={[styles.icon, isPositive ? styles.iconPlus : styles.iconMinus]}>
        <Text style={[styles.iconText, isPositive ? styles.iconTextPlus : styles.iconTextMinus]}>
          {isPositive ? '+' : '−'}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{transaction.description}</Text>
        <Text style={styles.ref}>{transaction.transaction_ref} · {formatDateTime(transaction.created_at)}</Text>
      </View>
      <Text style={[styles.value, isPositive ? styles.valuePlus : styles.valueMinus]}>
        {isPositive ? '+' : '-'}{absAmount} XP
      </Text>
    </View>
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
  lastRow: {
    borderBottomWidth: 0,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconPlus: {
    backgroundColor: Colors.green10,
  },
  iconMinus: {
    backgroundColor: Colors.red10,
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
  },
  iconTextPlus: {
    color: Colors.green,
  },
  iconTextMinus: {
    color: Colors.red,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate900,
  },
  ref: {
    fontSize: 11,
    color: Colors.slate400,
    marginTop: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  valuePlus: {
    color: Colors.green,
  },
  valueMinus: {
    color: Colors.red,
  },
})
