import React from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import theme from '../utils/theme'
import BottomNav from '../components/BottomNav'

function SafetyResourcesHome() {
    const navigation = useNavigation()

    const resourceSections = [
        {
            id: 'legalRights',
            title: 'Legal Rights',
            subtitle: 'Know your rights and legal protections',
            icon: '⚖️',
            gradient: ['#E3F2FD', '#BBDEFB', '#90CAF9'],
            description: 'Learn about your fundamental rights, legal protections, and how to report incidents safely.',
        },
        {
            id: 'selfDefense',
            title: 'Self-Defense Tips',
            subtitle: 'Learn basic self-defense techniques',
            icon: '🛡️',
            gradient: ['#FFEBEE', '#FFCDD2', '#EF9A9A'],
            description: 'Simple techniques and awareness tips to help you stay safe in various situations.',
        },
        {
            id: 'warningSigns',
            title: 'Warning Signs',
            subtitle: 'Recognize dangerous situations early',
            icon: '⚠️',
            gradient: ['#FFF3E0', '#FFE0B2', '#FFCC80'],
            description: 'Identify behavioral and environmental red flags before situations escalate.',
        },
    ]

    const handleExplore = (sectionId) => {
        switch (sectionId) {
            case 'legalRights':
                navigation.navigate('LegalRights')
                break
            case 'selfDefense':
                navigation.navigate('SelfDefenseTips')
                break
            case 'warningSigns':
                navigation.navigate('WarningSigns')
                break
        }
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
                        <Text style={styles.title}>Safety Resources</Text>
                        <Text style={styles.titleIcon}>📚</Text>
                    </View>
                    <Text style={styles.subtitle}>
                        Empower yourself with knowledge and practical safety information
                    </Text>
                </View>

                {/* Resource Cards */}
                <View style={styles.cardsContainer}>
                    {resourceSections.map((section) => (
                        <TouchableOpacity
                            key={section.id}
                            style={styles.cardWrapper}
                            onPress={() => handleExplore(section.id)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={section.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.card}
                            >
                                <View style={styles.cardContent}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardIcon}>{section.icon}</Text>
                                        <View style={styles.cardTitleContainer}>
                                            <Text style={styles.cardTitle}>{section.title}</Text>
                                            <Text style={styles.cardSubtitle}>{section.subtitle}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.cardDescription}>{section.description}</Text>
                                    <View style={styles.exploreButton}>
                                        <Text style={styles.exploreButtonText}>Explore →</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
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
        marginBottom: theme.spacing.xl,
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
        marginTop: -5,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    title: {
        fontSize: theme.fonts.sizes['3xl'],
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
    },
    titleIcon: {
        fontSize: 32,
        marginTop: 1,
    },
    subtitle: {
        fontSize: theme.fonts.sizes.base,
        color: theme.colors.textMuted,
        lineHeight: 22,
    },
    cardsContainer: {
        gap: theme.spacing.lg,
    },
    cardWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        ...theme.shadows.md,
    },
    card: {
        borderRadius: 16,
        padding: theme.spacing.lg,
    },
    cardContent: {
        gap: theme.spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.base,
    },
    cardIcon: {
        fontSize: 40,
    },
    cardTitleContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        fontWeight: theme.fonts.weights.medium,
    },
    cardDescription: {
        fontSize: theme.fonts.sizes.base,
        color: theme.colors.textDark,
        lineHeight: 22,
    },
    exploreButton: {
        alignSelf: 'flex-start',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.base,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        marginTop: theme.spacing.xs,
    },
    exploreButtonText: {
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.primary,
    },
})

export default SafetyResourcesHome

