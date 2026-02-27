import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const SLIDES = [
  {
    title: 'The Heart of Philippine Tech',
    desc: "DEVCON is the Philippines' largest volunteer tech community — 16 years of empowering developers nationwide.",
    img: 'https://devcon.ph/wp-content/uploads/2025/08/DEVCON_Philippines_16years.png',
  },
  {
    title: '11 Chapters, One Community',
    desc: 'From Manila to Davao — developers across Luzon, Visayas, and Mindanao gathering to Sync, Support, and Succeed.',
    img: 'https://devcon.ph/wp-content/uploads/brizy/imgs/1-Developers-and-professionals-gather-in-Mindanao-to-learn-new-insights-in-technology-323x215x0x19x323x196x1755791807.jpg',
  },
  {
    title: 'Earn Points. Unlock Perks.',
    desc: 'Attend events, speak, volunteer, and share content to earn XP and redeem exclusive DEVCON merch and rewards.',
    img: 'https://devcon.ph/wp-content/uploads/brizy/imgs/807f4c62e6d1d9bbb034f24b0b471aa6632a0378-534x196x106x0x323x196x1753803482.png',
  },
  {
    title: 'Your Global Opportunity Gateway',
    desc: "Access tech roles worldwide. Our community has reached institutions like the University of Zurich — and you're next.",
    img: 'https://devcon.ph/wp-content/uploads/brizy/imgs/5-10-323x218x0x22x323x196x1752721227.png',
  },
]

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const router = useRouter()

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
    setActiveIndex(idx)
  }

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * SCREEN_WIDTH, animated: true })
      setActiveIndex(activeIndex + 1)
    } else {
      router.replace('/(auth)/sign-in')
    }
  }

  const goBack = () => {
    if (activeIndex > 0) {
      scrollRef.current?.scrollTo({ x: (activeIndex - 1) * SCREEN_WIDTH, animated: true })
      setActiveIndex(activeIndex - 1)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar with logo + skip */}
      <View style={styles.topBar}>
        <View style={styles.logo}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>D+</Text>
          </View>
          <Text style={styles.logoName}>DEVCON+</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.slider}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <Image
              source={{ uri: slide.img }}
              style={styles.slideImage}
              resizeMode="cover"
            />
            <View style={styles.overlay} />
            <View style={styles.slideContent}>
              {/* Dot indicators */}
              <View style={styles.dots}>
                {SLIDES.map((_, j) => (
                  <View
                    key={j}
                    style={[styles.dot, j === activeIndex && styles.dotActive]}
                  />
                ))}
              </View>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideDesc}>{slide.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        {activeIndex > 0 && (
          <TouchableOpacity style={[styles.btn, styles.btnOutline, styles.flex1]} onPress={goBack}>
            <Text style={styles.btnOutlineText}>← Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.btn, styles.btnBlue, styles.flex1]}
          onPress={goNext}
        >
          <Text style={styles.btnBlueText}>
            {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blue,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: Colors.blue,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoMark: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.white,
  },
  logoName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  skip: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  slider: {
    flex: 1,
  },
  slide: {
    flex: 1,
    position: 'relative',
    backgroundColor: Colors.navy,
  },
  slideImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    background: undefined,
    backgroundColor: 'transparent',
    // Gradient-like overlay via multiple views is tricky without expo-linear-gradient
    // Using a semi-transparent dark overlay as fallback
  },
  slideContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 20,
    backgroundColor: 'rgba(20,30,90,0.7)',
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.white,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 32,
    marginBottom: 8,
  },
  slideDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.white,
  },
  flex1: {
    flex: 1,
  },
  btn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnBlue: {
    backgroundColor: Colors.blue,
  },
  btnBlueText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: Colors.slate300,
  },
  btnOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.slate700,
  },
})
