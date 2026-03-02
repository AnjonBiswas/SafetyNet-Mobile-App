import React, { useState, useMemo } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import theme from '../utils/theme'
import BottomNav from '../components/BottomNav'

function WarningSignsScreen() {
    const navigation = useNavigation()
    const [searchQuery, setSearchQuery] = useState('')
    const [imageModal, setImageModal] = useState(null) // null or 'behavior1' or 'behavior2'

    const behavioralSigns = [
        {
            id: 'behavior1',
            sign: 'Excessive attention or unwanted compliments',
            severity: 'mild',
            explanation: 'Someone who won\'t take "no" for an answer or keeps pushing boundaries',
            hasImage: true,
            imageDescription: 'This illustration shows examples of excessive attention and unwanted compliments. Watch for people who persistently give compliments even after you express discomfort, or those who continue to pursue you despite clear signals that you\'re not interested.',
        },
        {
            id: 'behavior2',
            sign: 'Ignoring personal space boundaries',
            severity: 'mild',
            explanation: 'Standing too close, touching without permission, or blocking your path',
            hasImage: true,
            imageDescription: 'This image demonstrates violations of personal space boundaries. Be aware of people who stand uncomfortably close, touch you without permission, or physically block your path. These are red flags that someone is not respecting your boundaries.',
        },
        {
            id: 'behavior3',
            sign: 'Asking personal questions too quickly',
            severity: 'mild',
            explanation: 'Trying to get personal information (address, schedule, living alone)',
            hasImage: true,
            imageDescription: 'This illustration shows how someone might try to extract personal information from you quickly. Be cautious of people asking about your address, daily schedule, whether you live alone, or other private details early in your interaction.',
        },
        {
            id: 'behavior4',
            sign: 'Following or monitoring your movements',
            severity: 'moderate',
            explanation: 'Appearing in multiple places you visit, showing up unexpectedly',
            hasImage: true,
            imageDescription: 'This image demonstrates stalking behavior where someone appears in multiple places you visit or shows up unexpectedly. This is a serious red flag indicating they are monitoring your movements and routines.',
        },
        {
            id: 'behavior5',
            sign: 'Aggressive or controlling behavior',
            severity: 'moderate',
            explanation: 'Telling you what to wear, who to see, or how to behave',
            hasImage: true,
            imageDescription: 'This illustration shows examples of aggressive or controlling behavior. Watch for people who try to control your appearance, relationships, or actions. This includes telling you what to wear, who you can see, or how you should behave.',
        },
        {
            id: 'behavior6',
            sign: 'Threats or intimidation',
            severity: 'severe',
            explanation: 'Making threats, showing weapons, or using fear to control you',
            hasImage: true,
            imageDescription: 'This is a severe warning sign. The image shows examples of threats or intimidation tactics, including verbal threats, showing weapons, or using fear to control you. This requires immediate action - contact authorities (999, 109, 10921) immediately.',
        },
        {
            id: 'behavior7',
            sign: 'Unpredictable mood swings',
            severity: 'moderate',
            explanation: 'Extreme changes from friendly to angry without clear reason',
            hasImage: true,
            imageDescription: 'This illustration demonstrates unpredictable mood swings where someone can change from friendly to angry without clear reason. This instability is a red flag that indicates potential danger and emotional volatility.',
        },
        {
            id: 'behavior8',
            sign: 'Refusing to accept rejection',
            severity: 'moderate',
            explanation: 'Continuing to pursue you after you\'ve clearly said no',
            hasImage: true,
            imageDescription: 'This image shows someone who refuses to accept rejection and continues to pursue you even after you\'ve clearly said no. This persistent behavior despite clear boundaries is a serious warning sign.',
        },
    ]

    const environmentalSigns = [
        {
            id: 'env1',
            sign: 'Isolated or deserted areas',
            severity: 'moderate',
            explanation: 'Empty parking lots, dark alleys, or remote locations',
            hasImage: true,
            imageDescription: 'This illustration shows isolated or deserted areas that pose safety risks. Empty parking lots, dark alleys, remote locations, or deserted buildings are dangerous environments where help may not be readily available.',
        },
        {
            id: 'env2',
            sign: 'Poor lighting',
            severity: 'moderate',
            explanation: 'Dark streets, broken streetlights, or unlit pathways',
            hasImage: true,
            imageDescription: 'This image demonstrates areas with poor lighting - dark streets, broken streetlights, or unlit pathways. Poor visibility makes it harder to see potential threats and harder for others to see you if you need help.',
        },
        {
            id: 'env3',
            sign: 'Blocked exits or escape routes',
            severity: 'severe',
            explanation: 'Doors blocked, paths cut off, or someone blocking your way',
            hasImage: true,
            imageDescription: 'This is a severe warning sign. The illustration shows blocked exits or escape routes - doors blocked, paths cut off, or someone physically blocking your way. This indicates intentional trapping and requires immediate action.',
        },
        {
            id: 'env4',
            sign: 'Lack of witnesses or people around',
            severity: 'moderate',
            explanation: 'Being alone with someone in a private or isolated space',
            hasImage: true,
            imageDescription: 'This image shows situations with a lack of witnesses or people around. Being alone with someone in a private or isolated space reduces your ability to get help if needed. Always prefer public spaces with other people present.',
        },
        {
            id: 'env5',
            sign: 'Someone trying to get you alone',
            severity: 'moderate',
            explanation: 'Insisting on going somewhere private or away from others',
            hasImage: true,
            imageDescription: 'This illustration demonstrates when someone is trying to get you alone by insisting on going somewhere private or away from others. This is a red flag - legitimate interactions don\'t require isolation.',
        },
    ]

    const onlineSigns = [
        {
            id: 'online1',
            sign: 'Unsolicited explicit messages or images',
            severity: 'moderate',
            explanation: 'Receiving inappropriate content without consent',
            hasImage: true,
            imageDescription: 'This illustration shows examples of unsolicited explicit messages or images. Receiving inappropriate sexual content without your consent is a form of harassment and should be reported immediately. Block the sender and document the content.',
        },
        {
            id: 'online2',
            sign: 'Persistent unwanted contact',
            severity: 'mild',
            explanation: 'Multiple messages, calls, or friend requests after being ignored',
            hasImage: true,
            imageDescription: 'This image demonstrates persistent unwanted contact - multiple messages, calls, or friend requests after you\'ve ignored them. This shows someone who won\'t respect your boundaries online.',
        },
        {
            id: 'online3',
            sign: 'Threats or harassment online',
            severity: 'severe',
            explanation: 'Threatening messages, doxxing, or cyberbullying',
            hasImage: true,
            imageDescription: 'This is a severe warning sign. The illustration shows online threats or harassment including threatening messages, doxxing (sharing private information), or cyberbullying. Document everything and report to authorities immediately.',
        },
        {
            id: 'online4',
            sign: 'Trying to get personal information',
            severity: 'moderate',
            explanation: 'Asking for address, schedule, or other private details',
            hasImage: true,
            imageDescription: 'This image shows someone trying to extract personal information online - asking for your address, schedule, or other private details. Never share personal information with strangers online, as this can be used to locate or harm you.',
        },
        {
            id: 'online5',
            sign: 'Creating fake profiles to contact you',
            severity: 'moderate',
            explanation: 'Using fake identities to bypass blocks or restrictions',
            hasImage: true,
            imageDescription: 'This illustration demonstrates someone creating fake profiles to contact you, using fake identities to bypass blocks or restrictions. This shows determination to contact you despite your boundaries and is a serious red flag.',
        },
        {
            id: 'online6',
            sign: 'Sharing your information without consent',
            severity: 'severe',
            explanation: 'Posting your photos, location, or personal details publicly',
            hasImage: true,
            imageDescription: 'This is a severe warning sign. The image shows someone sharing your information without consent - posting your photos, location, or personal details publicly. This can put you in immediate danger and requires immediate action.',
        },
    ]

    const escalationIndicators = [
        {
            id: 'escalate1',
            sign: 'Increasing frequency of contact',
            explanation: 'From occasional to constant messages or appearances',
            hasImage: true,
            imageDescription: 'This illustration shows the escalation pattern of increasing frequency of contact - from occasional messages or appearances to constant contact. This indicates the situation is getting worse and more dangerous.',
        },
        {
            id: 'escalate2',
            sign: 'Escalating intensity of behavior',
            explanation: 'From mild comments to threats or physical intimidation',
            hasImage: true,
            imageDescription: 'This image demonstrates escalating intensity of behavior - from mild comments to threats or physical intimidation. When behavior escalates in intensity, it\'s a clear sign that the situation is becoming more dangerous.',
        },
        {
            id: 'escalate3',
            sign: 'Ignoring clear boundaries',
            explanation: 'Continuing behavior after you\'ve set limits',
            hasImage: true,
            imageDescription: 'This illustration shows someone ignoring clear boundaries you\'ve set. When someone continues their behavior after you\'ve clearly set limits, it shows they don\'t respect your autonomy and the situation may escalate.',
        },
        {
            id: 'escalate4',
            sign: 'Showing up uninvited',
            explanation: 'Appearing at your home, workplace, or regular locations',
            hasImage: true,
            imageDescription: 'This is a serious escalation indicator. The image shows someone showing up uninvited at your home, workplace, or regular locations. This indicates they know your routine and are willing to invade your personal spaces.',
        },
        {
            id: 'escalate5',
            sign: 'Involving others in harassment',
            explanation: 'Getting friends or others to contact you on their behalf',
            hasImage: true,
            imageDescription: 'This illustration demonstrates when someone involves others in harassment - getting friends or others to contact you on their behalf. This shows organized harassment and is a serious escalation that requires immediate action.',
        },
    ]

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'mild':
                return '#FFC107'
            case 'moderate':
                return '#FF9800'
            case 'severe':
                return '#F44336'
            default:
                return '#9E9E9E'
        }
    }

    const getSeverityLabel = (severity) => {
        switch (severity) {
            case 'mild':
                return 'MILD'
            case 'moderate':
                return 'MODERATE'
            case 'severe':
                return 'SEVERE'
            default:
                return ''
        }
    }

    const whatToDoNext = [
        'Trust your instincts - if something feels wrong, it probably is',
        'Document everything - save messages, take screenshots, note dates and times',
        'Tell someone you trust about the situation',
        'Set clear boundaries and communicate them firmly',
        'Block and report online harassment immediately',
        'Avoid being alone with the person if possible',
        'Change your routine if someone is following you',
        'Contact authorities if you feel threatened (999, 109, 10921)',
        'Consider getting a protection order if the behavior continues',
        'Seek support from friends, family, or counseling services',
    ]

    // Filter data based on search query
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

    const filteredBehavioralSigns = useMemo(
        () => filterBySearch(behavioralSigns, ['sign', 'explanation']),
        [filterBySearch]
    )
    const filteredEnvironmentalSigns = useMemo(
        () => filterBySearch(environmentalSigns, ['sign', 'explanation']),
        [filterBySearch]
    )
    const filteredOnlineSigns = useMemo(
        () => filterBySearch(onlineSigns, ['sign', 'explanation']),
        [filterBySearch]
    )
    const filteredEscalationIndicators = useMemo(
        () => filterBySearch(escalationIndicators, ['sign', 'explanation']),
        [filterBySearch]
    )
    const filteredWhatToDoNext = useMemo(() => {
        if (!searchQuery.trim()) {
            return whatToDoNext
        }
        const query = searchQuery.toLowerCase().trim()
        return whatToDoNext.filter((action) => action.toLowerCase().includes(query))
    }, [searchQuery])

    const hasResults =
        filteredBehavioralSigns.length > 0 ||
        filteredEnvironmentalSigns.length > 0 ||
        filteredOnlineSigns.length > 0 ||
        filteredEscalationIndicators.length > 0 ||
        filteredWhatToDoNext.length > 0

    // Helper function to get image source based on item ID
    const getImageSource = (itemId) => {
        const imageMap = {
            behavior1: require('../../assets/Excessive attention or unwanted compliments.png'),
            behavior2: require('../../assets/Ignoring personal space boundaries.png'),
            behavior3: require('../../assets/Asking personal questions too quickly.png'),
            behavior4: require('../../assets/Following or monitoring your movements.png'),
            behavior5: require('../../assets/Aggressive or controlling behavior.png'),
            behavior6: require('../../assets/Threats or intimidation.png'),
            behavior7: require('../../assets/Unpredictable mood swings.png'),
            behavior8: require('../../assets/Refusing to accept rejection.png'),
            env1: require('../../assets/Isolated or deserted areas.png'),
            env2: require('../../assets/Poor lighting.png'),
            env3: require('../../assets/Blocked exits or escape routes.png'),
            env4: require('../../assets/Lack of witnesses or people around.png'),
            env5: require('../../assets/Someone trying to get you alone.png'),
            online1: require('../../assets/Unsolicited explicit messages or images.png'),
            online2: require('../../assets/Persistent unwanted contact.png'),
            online3: require('../../assets/Threats or harassment online.png'),
            online4: require('../../assets/Trying to get personal information.png'),
            online5: require('../../assets/Creating fake profiles to contact you.png'),
            online6: require('../../assets/Sharing your information without consent.png'),
            escalate1: require('../../assets/Increasing frequency of contact.png'),
            escalate2: require('../../assets/Escalating intensity of behavior.png'),
            escalate3: require('../../assets/Ignoring clear boundaries.png'),
            escalate4: require('../../assets/Showing up uninvited.png'),
            escalate5: require('../../assets/Involving others in harassment.png'),
        }
        return imageMap[itemId]
    }

    // Helper function to get item data for modal
    const getModalItemData = (itemId) => {
        const allItems = [
            ...behavioralSigns,
            ...environmentalSigns,
            ...onlineSigns,
            ...escalationIndicators,
        ]
        return allItems.find((item) => item.id === itemId)
    }

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
                        <Text style={styles.titleIcon}>⚠️</Text>
                        <Text style={styles.title}>Warning Signs</Text>
                    </View>
                    <Text style={styles.subtitle}>Recognize dangerous situations early</Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search warning signs, behaviors, or situations..."
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

                {/* Trust Your Instincts Reminder */}
                <View style={styles.reminderCard}>
                    <Text style={styles.reminderTitle}>💡 Trust Your Instincts</Text>
                    <Text style={styles.reminderText}>
                        Your intuition is a powerful safety tool. If something feels off, don't ignore it.
                        It's better to be cautious than to regret not acting.
                    </Text>
                </View>

                {hasResults ? (
                    <>
                        {/* Behavioral Warning Signs */}
                        {filteredBehavioralSigns.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Behavioral Warning Signs</Text>
                                <Text style={styles.sectionSubtitle}>Red flags in someone's behavior</Text>
                                <Text style={styles.sectionSubtitle2}>Tap and hold for details</Text>
                                {filteredBehavioralSigns.map((item, index) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.checklistItem}
                                        onLongPress={() => {
                                            if (item.hasImage) {
                                                setImageModal(item.id)
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.checklistLeft}>
                                            <View style={styles.serialNumber}>
                                                <Text style={styles.serialNumberText}>{index + 1}</Text>
                                            </View>
                                            <View style={styles.checklistContent}>
                                                <View style={styles.checklistHeader}>
                                                    <Text style={styles.checklistSign}>{item.sign}</Text>
                                                    <View
                                                        style={[
                                                            styles.severityBadge,
                                                            { backgroundColor: getSeverityColor(item.severity) },
                                                        ]}
                                                    >
                                                        <Text style={styles.severityText}>
                                                            {getSeverityLabel(item.severity)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.checklistExplanation}>{item.explanation}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Environmental Red Flags */}
                        {filteredEnvironmentalSigns.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Environmental Red Flags</Text>
                                <Text style={styles.sectionSubtitle}>Dangerous situations and locations</Text>
                                {filteredEnvironmentalSigns.map((item, index) => {
                                    const serialNumber = filteredBehavioralSigns.length + index + 1
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.checklistItem}
                                            onLongPress={() => {
                                                if (item.hasImage) {
                                                    setImageModal(item.id)
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.checklistLeft}>
                                                <View style={styles.serialNumber}>
                                                    <Text style={styles.serialNumberText}>{serialNumber}</Text>
                                                </View>
                                                <View style={styles.checklistContent}>
                                                    <View style={styles.checklistHeader}>
                                                        <Text style={styles.checklistSign}>{item.sign}</Text>
                                                        <View
                                                            style={[
                                                                styles.severityBadge,
                                                                { backgroundColor: getSeverityColor(item.severity) },
                                                            ]}
                                                        >
                                                            <Text style={styles.severityText}>
                                                                {getSeverityLabel(item.severity)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.checklistExplanation}>{item.explanation}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                        )}

                        {/* Online Harassment Warning Signals */}
                        {filteredOnlineSigns.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Online Harassment Warning Signals</Text>
                                <Text style={styles.sectionSubtitle}>Red flags in digital interactions</Text>
                                {filteredOnlineSigns.map((item, index) => {
                                    const serialNumber = filteredBehavioralSigns.length + filteredEnvironmentalSigns.length + index + 1
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.checklistItem}
                                            onLongPress={() => {
                                                if (item.hasImage) {
                                                    setImageModal(item.id)
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.checklistLeft}>
                                                <View style={styles.serialNumber}>
                                                    <Text style={styles.serialNumberText}>{serialNumber}</Text>
                                                </View>
                                                <View style={styles.checklistContent}>
                                                    <View style={styles.checklistHeader}>
                                                        <Text style={styles.checklistSign}>{item.sign}</Text>
                                                        <View
                                                            style={[
                                                                styles.severityBadge,
                                                                { backgroundColor: getSeverityColor(item.severity) },
                                                            ]}
                                                        >
                                                            <Text style={styles.severityText}>
                                                                {getSeverityLabel(item.severity)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.checklistExplanation}>{item.explanation}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                        )}

                        {/* Escalation Indicators */}
                        {filteredEscalationIndicators.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Escalation Indicators</Text>
                                <Text style={styles.sectionSubtitle}>Signs that a situation is getting worse</Text>
                                {filteredEscalationIndicators.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.escalationCard}
                                        onLongPress={() => {
                                            if (item.hasImage) {
                                                setImageModal(item.id)
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.escalationIcon}>📈</Text>
                                        <View style={styles.escalationContent}>
                                            <Text style={styles.escalationSign}>{item.sign}</Text>
                                            <Text style={styles.escalationExplanation}>{item.explanation}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* What to Do Next */}
                        {filteredWhatToDoNext.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>What to Do Next</Text>
                                <View style={styles.actionCard}>
                                    {filteredWhatToDoNext.map((action, index) => (
                                        <View key={index} style={styles.actionItem}>
                                            <Text style={styles.actionBullet}>•</Text>
                                            <Text style={styles.actionText}>{action}</Text>
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
            </ScrollView>

            {/* Image Modal */}
            <Modal
                visible={imageModal !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setImageModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setImageModal(null)}
                        >
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>

                        {imageModal && getImageSource(imageModal) && (() => {
                            const itemData = getModalItemData(imageModal)
                            return (
                                <>
                                    <Image
                                        source={getImageSource(imageModal)}
                                        style={styles.modalImage}
                                        resizeMode="contain"
                                    />
                                    <View style={styles.modalDescriptionContainer}>
                                        <Text style={styles.modalTitle}>
                                            {itemData?.sign || ''}
                                        </Text>
                                        <Text style={styles.modalDescription}>
                                            {itemData?.imageDescription || ''}
                                        </Text>
                                    </View>
                                </>
                            )
                        })()}
                    </View>
                </View>
            </Modal>

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
        marginTop: 30
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
        fontSize: 32,
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
    reminderCard: {
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderRadius: 12,
        padding: theme.spacing.base,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
        marginBottom: theme.spacing.lg,
    },
    reminderIcon: {
        fontSize: 24,
        marginBottom: theme.spacing.xs,
    },
    reminderTitle: {
        fontSize: 18,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        marginBottom: 4,
    },
    reminderText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textDark,
        lineHeight: 20,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.md,
    },
    sectionSubtitle2: {
        fontSize: 15,
        color: theme.colors.textMuted,
        marginBottom: 5,
        textAlign: 'center',
    },
    checklistItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: theme.spacing.base,
        marginBottom: theme.spacing.sm,
        ...theme.shadows.sm,
    },
    checklistLeft: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    serialNumber: {
        width: 28,
        height: 28,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
        ...theme.shadows.sm,
    },
    serialNumberText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: theme.fonts.weights.semibold,
    },
    checklistContent: {
        flex: 1,
    },
    checklistHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
        gap: theme.spacing.sm,
    },
    checklistSign: {
        flex: 1,
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.textDark,
    },
    severityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    severityText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    checklistExplanation: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        lineHeight: 18,
        marginTop: 4,
    },
    escalationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: theme.spacing.base,
        marginBottom: theme.spacing.sm,
        flexDirection: 'row',
        gap: theme.spacing.sm,
        ...theme.shadows.sm,
    },
    escalationIcon: {
        fontSize: 24,
    },
    escalationContent: {
        flex: 1,
    },
    escalationSign: {
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.textDark,
        marginBottom: 4,
    },
    escalationExplanation: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        lineHeight: 18,
    },
    actionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: theme.spacing.base,
        ...theme.shadows.sm,
    },
    actionItem: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        alignItems: 'flex-start',
    },
    actionBullet: {
        fontSize: 18,
        color: theme.colors.primary,
        fontWeight: 'bold',
        marginTop: 2,
    },
    actionText: {
        flex: 1,
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
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: theme.fonts.sizes.base,
        color: '#000',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '90%',
        padding: theme.spacing.lg,
        alignItems: 'center',
    },
    modalCloseButton: {
        position: 'absolute',
        top: theme.spacing.md,
        right: theme.spacing.md,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    modalCloseText: {
        fontSize: 20,
        color: theme.colors.textDark,
        fontWeight: 'bold',
    },
    modalImage: {
        width: '100%',
        height: 250,
        marginBottom: theme.spacing.md,
        borderRadius: 12,
    },
    modalDescriptionContainer: {
        width: '100%',
    },
    modalTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: theme.fonts.sizes.base,
        color: theme.colors.textMuted,
        lineHeight: 22,
        textAlign: 'left',
    },
})

export default WarningSignsScreen

