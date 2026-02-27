import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BlueHeader } from '@/components/BlueHeader'
import { ChipBar } from '@/components/ChipBar'
import { JobCard } from '@/components/JobCard'
import { Colors } from '@/constants/colors'
import { useJobsStore } from '@/stores/useJobsStore'

const FILTER_CHIPS = ['All', 'Remote', 'Onsite', 'Hybrid']

export default function JobsScreen() {
  const router = useRouter()
  const { jobs, savedIds, toggleSave } = useJobsStore()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = jobs.filter((job) => {
    const matchesSearch =
      search === '' ||
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      activeFilter === 'All' ||
      job.work_type.toLowerCase() === activeFilter.toLowerCase()
    return matchesSearch && matchesFilter && job.is_active
  })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BlueHeader>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Jobs Board</Text>
            <Text style={styles.headerSub}>Global Tech Opportunities 🌏</Text>
          </View>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs or companies…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
      </BlueHeader>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        <View style={styles.chipWrap}>
          <ChipBar
            chips={FILTER_CHIPS}
            activeChip={activeFilter}
            onSelect={setActiveFilter}
          />
        </View>

        <View style={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No jobs match your search.</Text>
            </View>
          ) : (
            filtered.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSaved={savedIds.includes(job.id)}
                onPress={() => router.push(`/(tabs)/jobs/${job.id}`)}
                onToggleSave={() => toggleSave(job.id)}
              />
            ))
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>More opportunities coming soon 🚀</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F1FB' },
  headerContent: { gap: 14 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.white,
    paddingVertical: 0,
  },
  chipWrap: {
    backgroundColor: Colors.white,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  list: { paddingTop: 12, paddingBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, color: Colors.slate400, fontWeight: '500' },
  footer: { alignItems: 'center', paddingVertical: 24, paddingBottom: 32 },
  footerText: { fontSize: 12, color: Colors.slate400 },
})
