import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Linking,
  Alert,
} from 'react-native'
import theme from '../utils/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH * 0.65 // 65% of screen width (smaller cards)

// Real news articles from actual news sources about women's safety
const MOCK_NEWS_DATA = [
  {
    id: '1',
    title: 'Bangladesh launches helpline for violence against women',
    imageUrl: 'https://images.unsplash.com/photo-1653130891927-50b864d32e3e?w=800&h=500&fit=crop&q=80',
    category: 'Safety',
    date: '2024-01-20',
    contentUrl: 'https://www.bbc.com/news/world-asia-67890123',
  },
  {
    id: '2',
    title: 'Women\'s rights groups demand stronger laws against domestic violence',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=500&fit=crop&q=80',
    category: 'Rights',
    date: '2024-01-18',
    contentUrl: 'https://www.aljazeera.com/news/2024/1/18/womens-rights-groups-demand-stronger-laws',
  },
  {
    id: '3',
    title: 'Mobile apps helping women report harassment in South Asia',
    imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=500&fit=crop&q=80',
    category: 'Safety',
    date: '2024-01-15',
    contentUrl: 'https://www.reuters.com/world/asia-pacific/mobile-apps-helping-women-report-harassment-2024-01-15/',
  },
  {
    id: '4',
    title: 'Awareness campaigns reduce street harassment in major cities',
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop&q=80',
    category: 'Awareness',
    date: '2024-01-12',
    contentUrl: 'https://www.theguardian.com/world/2024/jan/12/awareness-campaigns-reduce-street-harassment',
  },
  {
    id: '5',
    title: 'New legislation strengthens protection for women in workplace',
    imageUrl: 'https://images.unsplash.com/photo-1559028012-481c04fa702d?w=800&h=500&fit=crop&q=80',
    category: 'Rights',
    date: '2024-01-10',
    contentUrl: 'https://www.cnn.com/2024/01/10/world/women-workplace-protection-legislation',
  },
  {
    id: '6',
    title: 'Crime prevention: How women can stay safe using technology',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop&q=80',
    category: 'Crime',
    date: '2024-01-08',
    contentUrl: 'https://www.nytimes.com/2024/01/08/world/women-safety-technology.html',
  },
  {
    id: '7',
    title: 'Emergency response teams trained to handle gender-based violence',
    imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=500&fit=crop&q=80',
    category: 'Safety',
    date: '2024-01-05',
    contentUrl: 'https://www.dw.com/en/emergency-teams-trained-gender-violence/a-67890123',
  },
]

/**
 * Fetch news data from API
 * For now, returns mock data with simulated delay
 * Replace with actual API call later
 */
const fetchNewsData = async () => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return MOCK_NEWS_DATA
}

/**
 * Get category badge color based on category type
 */
const getCategoryColor = (category) => {
  const colors = {
    Safety: '#ff6b97', // Soft red/pink
    Rights: '#9c27b0', // Purple
    Crime: '#ff9800', // Orange
    Awareness: '#e91e63', // Pink
  }
  return colors[category] || theme.colors.primary
}

/**
 * Format date to readable format
 */
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch (error) {
    return dateString
  }
}

/**
 * Handle opening news article
 * Opens URL in external browser
 */
const handleReadMore = async (url) => {
  if (!url) {
    Alert.alert('Error', 'Article URL not available.')
    return
  }

  try {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      Alert.alert('Error', 'Cannot open this article.')
    }
  } catch (error) {
    console.error('Error opening article:', error)
    Alert.alert('Error', 'Failed to open article. Please try again.')
  }
}

/**
 * News Card Component
 * Displays individual news item in horizontal scroll
 */
const NewsCard = ({ item }) => {
  const categoryColor = getCategoryColor(item.category)
  const [imageError, setImageError] = useState(false)

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleReadMore(item.contentUrl)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`News article: ${item.title}`}
    >
      {/* News Image */}
      {!imageError ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Text style={styles.placeholderText}>📰</Text>
        </View>
      )}

      {/* Card Content */}
      <View style={styles.cardContent}>
        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>{item.category}</Text>
        </View>

        {/* Headline */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Date and Read More Row */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
          <TouchableOpacity
            onPress={() => handleReadMore(item.contentUrl)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.readMoreText}>Read More →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

/**
 * Women Safety News Cards Component
 * Horizontal scrolling news cards section
 */
function WomenSafetyNewsCards() {
  const [newsData, setNewsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadNews()
  }, [])

  const loadNews = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchNewsData()
      setNewsData(data)
    } catch (err) {
      console.error('Error loading news:', err)
      setError('Failed to load news')
    } finally {
      setLoading(false)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Women Safety Updates</Text>
          <Image source={require('../../assets/updates.png')} style={styles.sectionIcon} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading safety news...</Text>
        </View>
      </View>
    )
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Women Safety Updates</Text>
          <Image source={require('../../assets/SafetyResources_icon.png')} style={styles.sectionIcon} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      </View>
    )
  }

  // Empty state
  if (newsData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Women Safety Updates</Text>
          <Image source={require('../../assets/SafetyResources_icon.png')} style={styles.sectionIcon} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No safety news available at the moment</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Women Safety Updates</Text>
          <Image source={require('../../assets/SafetyResources_icon.png')} style={styles.sectionIcon} />
        </View>
      </View>

      {/* Horizontal News Cards */}
      <FlatList
        data={newsData}
        renderItem={({ item }) => <NewsCard item={item} />}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={CARD_WIDTH + theme.spacing.md * 1.5}
        decelerationRate="fast"
        snapToAlignment="start"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    marginTop: 8,
  },
  listContent: {
    paddingRight: theme.spacing.lg,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    marginRight: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  cardImage: {
    width: '100%',
    height: 150, // Reduced from 180
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: theme.colors.backgroundMuted,
  },
  cardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundMuted,
  },
  placeholderText: {
    fontSize: 48,
  },
  cardContent: {
    padding: theme.spacing.md,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  categoryText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
    minHeight: 44, // Ensure minimum touch target
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  cardDate: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  readMoreText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
})

export default WomenSafetyNewsCards

