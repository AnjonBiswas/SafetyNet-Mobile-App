import React, { useState, useMemo, useRef } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Linking,
    Platform,
    Image,
    Animated,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import theme from '../utils/theme'
import BottomNav from '../components/BottomNav'

function SelfDefenseTipsScreen() {
    const navigation = useNavigation()
    const [savedTips, setSavedTips] = useState(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [flippedCards, setFlippedCards] = useState(new Set())
    const flipAnimations = useRef({})

    const awarenessImages = {
        'Stay Alert': require('../../assets/Stay Alert.jpg'),
        'Trust Your Instincts': require('../../assets/Trust Your Instincts.jpg'),
        'Plan Your Route': require('../../assets/Plan Your Route.jpg'),
        'Stay Visible': require('../../assets/Stay Visible.jpg'),
    }

    const getFlipValue = (id) => {
        if (!flipAnimations.current[id]) {
            flipAnimations.current[id] = new Animated.Value(0)
        }
        return flipAnimations.current[id]
    }

    const handleFlip = (tipId) => {
        const isFlipped = flippedCards.has(tipId)
        const animation = getFlipValue(tipId)

        Animated.timing(animation, {
            toValue: isFlipped ? 0 : 1,
            duration: 450,
            useNativeDriver: true,
        }).start()

        setFlippedCards((prev) => {
            const next = new Set(prev)
            if (isFlipped) {
                next.delete(tipId)
            } else {
                next.add(tipId)
            }
            return next
        })
    }

    const toggleSave = (tipId) => {
        setSavedTips((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(tipId)) {
                newSet.delete(tipId)
            } else {
                newSet.add(tipId)
            }
            return newSet
        })
    }

    const awarenessTips = [
        {
            id: 'awareness1',
            title: 'Stay Alert',
            description: 'Always be aware of your surroundings. Avoid distractions like phones when walking alone.',
            icon: '👁️',
        },
        {
            id: 'awareness2',
            title: 'Trust Your Instincts',
            description: 'If something feels wrong, it probably is. Don\'t ignore your gut feeling.',
            icon: '🧠',
        },
        {
            id: 'awareness3',
            title: 'Plan Your Route',
            description: 'Know where you\'re going and have alternative routes. Avoid isolated areas.',
            icon: '🗺️',
        },
        {
            id: 'awareness4',
            title: 'Stay Visible',
            description: 'Walk in well-lit areas. Avoid shortcuts through dark alleys or parks.',
            icon: '💡',
        },
    ]

    const defenseMoves = [
        {
            id: 'move1',
            step: 1,
            title: 'Escape Wrist Grabs',
            description: 'Twist your wrist in the direction of their thumb (weakest point) and pull away quickly.',
            icon: '✋',
            videoId: 'm5dWBTRVNvk',
        },
        {
            id: 'move2',
            step: 2,
            title: 'Break Bear Hugs',
            description: 'Drop your weight, stomp on their foot, and use your elbows to strike their ribs.',
            icon: '🤝',
            videoId: 'E3PWY6xX1tQ',
        },
        {
            id: 'move3',
            step: 3,
            title: 'Use Your Voice',
            description: 'Yell "FIRE!" or "HELP!" loudly. It attracts more attention than "rape" or "attack".',
            icon: '📢',
            videoId: 'vTJFNI3j6A4',
        },
        {
            id: 'move4',
            step: 4,
            title: 'Target Vulnerable Areas',
            description: 'Aim for eyes, nose, throat, groin, or knees. Use keys, elbows, or knees as weapons.',
            icon: '🎯',
            videoId: 'vTJFNI3j6A4',
        },
        {
            id: 'move5',
            step: 5,
            title: 'Create Distance',
            description: 'After striking, immediately run away. Don\'t stay to fight - your goal is escape.',
            icon: '🏃',
            videoId: 'vTJFNI3j6A4',
        },
    ]

    const openYouTubeVideo = async (videoId) => {
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
        const youtubeAppUrl = Platform.select({
            ios: `youtube://watch?v=${videoId}`,
            android: `vnd.youtube:${videoId}`,
        })

        try {
            // Try to open in YouTube app first
            const canOpenApp = await Linking.canOpenURL(youtubeAppUrl)
            if (canOpenApp) {
                await Linking.openURL(youtubeAppUrl)
            } else {
                // Fallback to browser
                await Linking.openURL(youtubeUrl)
            }
        } catch (error) {
            console.error('Error opening YouTube video:', error)
            // Fallback to browser if app fails
            try {
                await Linking.openURL(youtubeUrl)
            } catch (fallbackError) {
                console.error('Error opening YouTube in browser:', fallbackError)
            }
        }
    }

    const situationalTips = [
        {
            id: 'situation1',
            situation: 'Public Transport',
            tips: [
                'Sit near the driver or in crowded areas',
                'Keep your bag close and zipped',
                'Have your phone ready to call for help',
                'Get off at the next stop if someone makes you uncomfortable',
            ],
            icon: '🚌',
        },
        {
            id: 'situation2',
            situation: 'Night Walking',
            tips: [
                'Walk confidently with purpose',
                'Carry a flashlight or use phone light',
                'Share your location with trusted contacts',
                'Consider carrying a personal alarm',
            ],
            icon: '🌙',
        },
        {
            id: 'situation3',
            situation: 'Crowded Places',
            tips: [
                'Be aware of people standing too close',
                'Keep your wallet/phone in front pockets',
                'Watch for distractions (bumping, spills)',
                'Stay near exits and security personnel',
            ],
            icon: '👥',
        },
    ]

    const legalProtection = [
        {
            id: 'legal1',
            item: 'Personal Alarm',
            description: 'Loud alarm devices are legal and can attract attention',
            icon: '🔔',
        },
        {
            id: 'legal2',
            item: 'Whistle',
            description: 'Simple, effective, and completely legal',
            icon: '📣',
        },
        {
            id: 'legal3',
            item: 'Flashlight',
            description: 'Bright light can disorient attackers and help you see',
            icon: '🔦',
        },
        {
            id: 'legal4',
            item: 'Keys',
            description: 'Hold keys between fingers as a defensive tool (use responsibly)',
            icon: '🔑',
        },
    ]

    const mentalPreparedness = [
        'Practice saying "NO" firmly and confidently',
        'Visualize escape routes in new environments',
        'Stay calm and breathe deeply in stressful situations',
        'Remember: Your safety is more important than being polite',
        'Have emergency contacts saved and easily accessible',
    ]

    const situationalImages = {
        'Public Transport': require('../../assets/Public Transport.jpg'),
        'Night Walking': require('../../assets/Night Walking.jpg'),
        'Crowded Places': require('../../assets/Crowded Places.jpg'),
    }

    const legalImages = {
        'Personal Alarm': require('../../assets/Personal Alarm.jpg'),
        Whistle: require('../../assets/Whistle.jpg'),
        Flashlight: require('../../assets/Flashlight.jpg'),
        Keys: require('../../assets/Keys.jpg'),
    }

    // Search filtering logic
    const filterBySearch = React.useCallback((items, searchFields) => {
        if (!searchQuery.trim()) {
            return items
        }
        const query = searchQuery.toLowerCase().trim()
        return items.filter((item) => {
            return searchFields.some((field) => {
                const value = item[field]
                if (Array.isArray(value)) {
                    return value.some((v) => v.toLowerCase().includes(query))
                }
                return value && value.toLowerCase().includes(query)
            })
        })
    }, [searchQuery])

    // Filtered data based on search
    const filteredAwarenessTips = useMemo(
        () => filterBySearch(awarenessTips, ['title', 'description']),
        [filterBySearch]
    )
    const filteredDefenseMoves = useMemo(
        () => filterBySearch(defenseMoves, ['title', 'description']),
        [filterBySearch]
    )
    const filteredSituationalTips = useMemo(
        () => filterBySearch(situationalTips, ['situation', 'tips']),
        [filterBySearch]
    )
    const filteredLegalProtection = useMemo(
        () => filterBySearch(legalProtection, ['item', 'description']),
        [filterBySearch]
    )
    const filteredMentalPreparedness = useMemo(() => {
        if (!searchQuery.trim()) {
            return mentalPreparedness
        }
        const query = searchQuery.toLowerCase().trim()
        return mentalPreparedness.filter((tip) => tip.toLowerCase().includes(query))
    }, [searchQuery])

    const hasResults =
        filteredAwarenessTips.length > 0 ||
        filteredDefenseMoves.length > 0 ||
        filteredSituationalTips.length > 0 ||
        filteredLegalProtection.length > 0 ||
        filteredMentalPreparedness.length > 0

    return (
        <LinearGradient
            colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.1 }}
            style={styles.container}
        >
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <View style={styles.titleRow}>
                        <Image
                            source={require('../../assets/DefenseTechnique_icon.png')}
                            style={styles.titleIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Self-Defense Tips</Text>
                    </View>
                    <Text style={styles.subtitle}>Learn basic self-defense techniques</Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search tips, techniques, or situations..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={theme.colors.textMuted}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                            <Text style={styles.clearButtonText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {hasResults ? (
                    <>
                        {/* Awareness & Prevention */}
                        {filteredAwarenessTips.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Awareness & Prevention</Text>
                                <View style={styles.tipsGrid}>
                                    {filteredAwarenessTips.map((tip) => {
                                        const animation = getFlipValue(tip.id)
                                        const rotateY = animation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '180deg'],
                                        })
                                        const rotateYBack = animation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['180deg', '360deg'],
                                        })
                                        const frontOpacity = animation.interpolate({
                                            inputRange: [0, 0.5, 0.5, 1],
                                            outputRange: [1, 1, 0, 0],
                                        })
                                        const backOpacity = animation.interpolate({
                                            inputRange: [0, 0.5, 0.5, 1],
                                            outputRange: [0, 0, 1, 1],
                                        })

                                        return (
                                            <TouchableOpacity
                                                key={tip.id}
                                                activeOpacity={0.9}
                                                onPress={() => handleFlip(tip.id)}
                                                style={styles.tipCard}
                                            >
                                                <View style={styles.flipWrapper}>
                                                    <Animated.View
                                                        style={[
                                                            styles.flipFace,
                                                            styles.flipFront,
                                                            {
                                                                opacity: frontOpacity,
                                                                transform: [
                                                                    { perspective: 1000 },
                                                                    { rotateY },
                                                                ],
                                                            },
                                                        ]}
                                                    >
                                                        <View style={styles.tipHeader}>
                                                            <Text style={styles.tipIcon}>{tip.icon}</Text>
                                                            <TouchableOpacity
                                                                style={styles.saveButton}
                                                                onPress={() => toggleSave(tip.id)}
                                                            >
                                                                <Text style={styles.saveIcon}>
                                                                    {savedTips.has(tip.id) ? '🔖' : '📌'}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                        <Text style={styles.tipTitle}>{tip.title}</Text>
                                                        <Text style={styles.tipDescription}>{tip.description}</Text>
                                                    </Animated.View>

                                                    <Animated.View
                                                        style={[
                                                            styles.flipFace,
                                                            styles.flipBack,
                                                            {
                                                                opacity: backOpacity,
                                                                transform: [
                                                                    { perspective: 1000 },
                                                                    { rotateY: rotateYBack },
                                                                ],
                                                            },
                                                        ]}
                                                    >
                                                        {awarenessImages[tip.title] && (
                                                            <Image
                                                                source={awarenessImages[tip.title]}
                                                                style={styles.tipImage}
                                                                resizeMode="cover"
                                                            />
                                                        )}
                                                    </Animated.View>
                                                </View>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Self-Defense Moves */}
                        {filteredDefenseMoves.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Basic Self-Defense Moves</Text>
                                {filteredDefenseMoves.map((move) => (
                                    <TouchableOpacity
                                        key={move.id}
                                        style={styles.stepCard}
                                        onLongPress={() => {
                                            if (move.videoId) {
                                                openYouTubeVideo(move.videoId)
                                            }
                                        }}
                                        activeOpacity={0.95}
                                    >
                                        <View style={styles.stepHeader}>
                                            <View style={styles.stepNumber}>
                                                <Text style={styles.stepNumberText}>{move.step}</Text>
                                            </View>
                                            <View style={styles.stepContent}>
                                                <View style={styles.stepTitleRow}>
                                                    <Text style={styles.stepIcon}>{move.icon}</Text>
                                                    <Text style={styles.stepTitle}>{move.title}</Text>
                                                    <TouchableOpacity
                                                        style={styles.saveButton}
                                                        onPress={() => toggleSave(move.id)}
                                                    >
                                                        <Text style={styles.saveIcon}>
                                                            {savedTips.has(move.id) ? '🔖' : '📌'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <Text style={styles.stepDescription}>{move.description}</Text>

                                                {/* Video Hint */}
                                                {move.videoId && (
                                                    <View style={styles.videoHint}>
                                                        <Text style={styles.videoHintIcon}>📹</Text>
                                                        <Text style={styles.videoHintText}>Tap and hold to watch video</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Situational Safety */}
                        {filteredSituationalTips.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Situational Safety Tips</Text>
                                {filteredSituationalTips.map((situation) => {
                                    const animation = getFlipValue(situation.id)
                                    const rotateY = animation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', '180deg'],
                                    })
                                    const rotateYBack = animation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['180deg', '360deg'],
                                    })
                                    const frontOpacity = animation.interpolate({
                                        inputRange: [0, 0.5, 0.5, 1],
                                        outputRange: [1, 1, 0, 0],
                                    })
                                    const backOpacity = animation.interpolate({
                                        inputRange: [0, 0.5, 0.5, 1],
                                        outputRange: [0, 0, 1, 1],
                                    })

                                    return (
                                        <TouchableOpacity
                                            key={situation.id}
                                            activeOpacity={0.92}
                                            onPress={() => handleFlip(situation.id)}
                                            style={styles.situationCard}
                                        >
                                            <View style={styles.flipWrapper}>
                                                <Animated.View
                                                    style={[
                                                        styles.flipFace,
                                                        styles.flipFront,
                                                        {
                                                            opacity: frontOpacity,
                                                            transform: [
                                                                { perspective: 1000 },
                                                                { rotateY },
                                                            ],
                                                        },
                                                    ]}
                                                >
                                                    <View style={styles.situationHeader}>
                                                        <Text style={styles.situationIcon}>{situation.icon}</Text>
                                                        <Text style={styles.situationTitle}>{situation.situation}</Text>
                                                    </View>
                                                    <View style={styles.situationTips}>
                                                        {situation.tips.map((tip, index) => (
                                                            <View key={index} style={styles.situationTipItem}>
                                                                <Text style={styles.situationBullet}>•</Text>
                                                                <Text style={styles.situationTipText}>{tip}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </Animated.View>

                                                <Animated.View
                                                    style={[
                                                        styles.flipFace,
                                                        styles.flipBack,
                                                        {
                                                            opacity: backOpacity,
                                                            transform: [
                                                                { perspective: 1000 },
                                                                { rotateY: rotateYBack },
                                                            ],
                                                        },
                                                    ]}
                                                >
                                                    {situationalImages[situation.situation] && (
                                                        <Image
                                                            source={situationalImages[situation.situation]}
                                                            style={styles.situationImage}
                                                            resizeMode="cover"
                                                        />
                                                    )}
                                                </Animated.View>
                                            </View>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                        )}

                        {/* Legal Protection Items */}
                        {filteredLegalProtection.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>What to Carry (Legal Items)</Text>
                                <View style={styles.legalItemsGrid}>
                                    {filteredLegalProtection.map((item) => {
                                        const animation = getFlipValue(item.id)
                                        const rotateY = animation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '180deg'],
                                        })
                                        const rotateYBack = animation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['180deg', '360deg'],
                                        })
                                        const frontOpacity = animation.interpolate({
                                            inputRange: [0, 0.5, 0.5, 1],
                                            outputRange: [1, 1, 0, 0],
                                        })
                                        const backOpacity = animation.interpolate({
                                            inputRange: [0, 0.5, 0.5, 1],
                                            outputRange: [0, 0, 1, 1],
                                        })

                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                activeOpacity={0.92}
                                                onPress={() => handleFlip(item.id)}
                                                style={styles.legalItemCard}
                                            >
                                                <View style={styles.flipWrapper}>
                                                    <Animated.View
                                                        style={[
                                                            styles.flipFace,
                                                            styles.flipFront,
                                                            {
                                                                opacity: frontOpacity,
                                                                transform: [
                                                                    { perspective: 1000 },
                                                                    { rotateY },
                                                                ],
                                                            },
                                                        ]}
                                                    >
                                                        <View style={styles.legalItemHeader}>
                                                            <Text style={styles.legalItemIcon}>{item.icon}</Text>
                                                            <Text style={styles.legalItemTitle}>{item.item}</Text>
                                                        </View>
                                                        <Text style={styles.legalItemDescription}>{item.description}</Text>
                                                    </Animated.View>

                                                    <Animated.View
                                                        style={[
                                                            styles.flipFace,
                                                            styles.flipBack,
                                                            {
                                                                opacity: backOpacity,
                                                                transform: [
                                                                    { perspective: 1000 },
                                                                    { rotateY: rotateYBack },
                                                                ],
                                                            },
                                                        ]}
                                                    >
                                                        {legalImages[item.item] && (
                                                            <Image
                                                                source={legalImages[item.item]}
                                                                style={styles.legalImage}
                                                                resizeMode="cover"
                                                            />
                                                        )}
                                                    </Animated.View>
                                                </View>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Mental Preparedness */}
                        {filteredMentalPreparedness.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Mental Preparedness</Text>
                                <View style={styles.mentalCard}>
                                    {filteredMentalPreparedness.map((tip, index) => (
                                        <View key={index} style={styles.mentalTipItem}>
                                            <Text style={styles.mentalBullet}>✓</Text>
                                            <Text style={styles.mentalTipText}>{tip}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyText}>No results found</Text>
                        <Text style={styles.emptyHint}>Try different keywords or clear your search</Text>
                    </View>
                )}

                {/* Safety Disclaimer */}
                <View style={styles.disclaimerCard}>
                    <Text style={styles.disclaimerIcon}>⚠️</Text>
                    <Text style={styles.disclaimerTitle}>Safety Disclaimer</Text>
                    <Text style={styles.disclaimerText}>
                        These tips are for educational purposes. The best defense is prevention and awareness.
                        Always prioritize escape over confrontation. Consider taking a professional self-defense
                        course for hands-on training. These techniques should only be used when escape is not
                        possible and you are in immediate danger.
                    </Text>
                </View>
            </ScrollView>
            <BottomNav />
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: 140,
    },
    header: {
        marginBottom: theme.spacing.lg,
        marginTop: 30,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
    },
    backButtonText: {
        fontSize: 26,
        color: theme.colors.primary,
        marginTop: -12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    titleIcon: {
        width: 36,
        height: 36,
    },
    title: {
        fontSize: theme.fonts.sizes['3xl'],
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
    },
    subtitle: {
        fontSize: theme.fonts.sizes.base,
        color: theme.colors.textMuted,
        lineHeight: 22,
        marginTop: theme.spacing.xs,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.md,
    },
    tipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    tipCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: theme.spacing.base,
        ...theme.shadows.sm,
        minHeight: 200,
        overflow: 'hidden',
    },
    flipWrapper: {
        flex: 1,
        position: 'relative',
    },
    flipFace: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backfaceVisibility: 'hidden',
    },
    flipFront: {
        zIndex: 2,
    },
    flipBack: {
        zIndex: 1,
    },
    tipHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    tipIcon: {
        fontSize: 28,
    },
    saveButton: {
        padding: 4,
    },
    saveIcon: {
        fontSize: 18,
    },
    tipTitle: {
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        marginBottom: 3,
    },
    tipDescription: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        lineHeight: 15,
    },
    tipImage: {
        width: '130%',
        height: '130%',
        borderRadius: 12,
        alignSelf: 'center',
        marginTop: -17,
    },
    situationImage: {
        width: '130%',
        height: '130%',
        borderRadius: 12,
        alignSelf: 'center',
        marginTop: -17,
    },
    stepCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: theme.spacing.base,
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
    },
    stepHeader: {
        flexDirection: 'row',
        gap: theme.spacing.base,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.bold,
        color: '#FFFFFF',
    },
    stepContent: {
        flex: 1,
    },
    stepTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    stepIcon: {
        fontSize: 20,
    },
    stepTitle: {
        flex: 1,
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
    },
    stepDescription: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        lineHeight: 20,
    },
    situationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: theme.spacing.base,
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
        minHeight: 193,
        overflow: 'hidden',
    },
    situationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    situationIcon: {
        fontSize: 24,
    },
    situationTitle: {
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
    },
    situationTips: {
        gap: theme.spacing.xs,
    },
    situationTipItem: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    situationBullet: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    situationTipText: {
        flex: 1,
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textDark,
        lineHeight: 20,
    },
    legalItemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    legalItemCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: theme.spacing.base,
        ...theme.shadows.sm,
        minHeight: 155,
        overflow: 'hidden',
    },
    legalItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
        gap: theme.spacing.xs,
    },
    legalItemIcon: {
        fontSize: 24,
    },
    legalItemTitle: {
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        flex: 1,
    },
    legalItemDescription: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        lineHeight: 18,
    },
    legalImage: {
        width: '130%',
        height: '130%',
        borderRadius: 12,
        alignSelf: 'center',
        marginTop: -17,
    },
    mentalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: theme.spacing.base,
        ...theme.shadows.sm,
    },
    mentalTipItem: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    mentalBullet: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    mentalTipText: {
        flex: 1,
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textDark,
        lineHeight: 20,
    },
    disclaimerCard: {
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        borderRadius: 12,
        padding: theme.spacing.base,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800',
        marginTop: theme.spacing.md,
    },
    disclaimerIcon: {
        fontSize: 24,
        marginBottom: theme.spacing.xs,
    },
    disclaimerTitle: {
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.xs,
    },
    disclaimerText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textDark,
        lineHeight: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: theme.spacing.base,
        paddingVertical: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
        ...theme.shadows.sm,
    },
    searchIcon: {
        fontSize: 20,
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: theme.fonts.sizes.base,
        color: theme.colors.textDark,
    },
    clearButton: {
        padding: 4,
        marginLeft: theme.spacing.xs,
    },
    clearButtonText: {
        fontSize: 18,
        color: theme.colors.textMuted,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: theme.spacing.xl,
        marginTop: theme.spacing.xl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.xs,
    },
    emptyHint: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
    videoHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        backgroundColor: 'rgba(255, 77, 110, 0.1)',
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    videoHintIcon: {
        fontSize: 14,
        marginRight: theme.spacing.xs,
    },
    videoHintText: {
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.primary,
        fontWeight: theme.fonts.weights.medium,
        fontStyle: 'italic',
    },
})

export default SelfDefenseTipsScreen

