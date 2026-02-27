import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native'
import { Colors } from '@/constants/colors'

interface ComingSoonModalProps {
  visible: boolean
  onClose: () => void
  featureName?: string
}

export function ComingSoonModal({ visible, onClose, featureName }: ComingSoonModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.icon}>🚧</Text>
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.desc}>
          {featureName
            ? `${featureName} is not yet available.`
            : 'This feature is not yet available.'}{' '}
          Check back after Cohort 3 Graduation!
        </Text>
        <TouchableOpacity style={styles.btn} onPress={onClose}>
          <Text style={styles.btnText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.slate200,
    borderRadius: 2,
    marginBottom: 18,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: Colors.slate500,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.slate900,
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  btn: {
    backgroundColor: Colors.blue,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
})
