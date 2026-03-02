import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native'
import theme from '../utils/theme'
import BottomNav from '../components/BottomNav'

const modules = [
  {
    title: 'Protection & Preparedness',
    content: 'Learn situational awareness, safe routes, and response plans.',
  },
  {
    title: 'Safety & Awareness',
    content: 'Recognize warning signs, safe behaviors, and community tips.',
  },
  {
    title: 'Legal Rights',
    content: 'Understand your rights and how to seek legal support.',
  },
  {
    title: 'Digital Safety',
    content: 'Protect your online identity and stay safe on social platforms.',
  },
]

function EducationScreen() {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    // Could fetch education modules from API in future
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 600)
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.logoText}>SafetyNet</Text>
          <Text style={styles.tagline}>Education</Text>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderText}>Loading...</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {modules.map((item) => (
              <View key={item.title} style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.content}</Text>
                <TouchableOpacity style={styles.ctaButton}>
                  <Text style={styles.ctaText}>Open Module</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight,
  },
  scrollContent: {
    paddingBottom: 120, // space for bottom nav
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: theme.spacing.xl,
  },
  logoText: {
    fontSize: theme.fonts.sizes['3xl'],
    fontFamily: theme.fonts.heading,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  tagline: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textWhite,
    marginTop: theme.spacing.xs,
  },
  loader: {
    padding: theme.spacing['2xl'],
    alignItems: 'center',
  },
  loaderText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textMuted,
  },
  list: {
    padding: theme.spacing.xl,
    rowGap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius['2xl'],
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  cardTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
  },
  cardDesc: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  ctaButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  ctaText: {
    color: theme.colors.textWhite,
    fontWeight: theme.fonts.weights.semibold,
  },
})

export default EducationScreen
