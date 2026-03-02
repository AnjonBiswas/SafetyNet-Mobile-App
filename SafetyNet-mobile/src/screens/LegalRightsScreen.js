import React, { useState, useMemo } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import theme from '../utils/theme'
import BottomNav from '../components/BottomNav'

// Legal rights data - defined outside component for useMemo
const legalRightsData = [
    {
        id: 'prevention',
        title: 'Prevention of Oppression Against Women and Children Act, 2000',
        icon: '⚖️',
        content: [
            'This law specifically protects women and children from violence and oppression',
            'Covers physical, mental, and sexual abuse against women',
            'Provides for punishment of perpetrators with imprisonment and fines',
            'Special provisions for protection of victims during trial',
            'Fast-track courts established for quick disposal of cases',
            'Victims can seek compensation from offenders',
        ],
    },
    {
        id: 'dowry',
        title: 'Dowry Prohibition Act & Women Protection',
        icon: '🚫',
        content: [
            'Dowry is illegal in Bangladesh - giving or taking dowry is a punishable offense',
            'If you face dowry-related harassment, you can file a case under this act',
            'The law protects you from being forced into marriage for dowry',
            'You have the right to refuse dowry demands without consequences',
            'Report dowry demands to police or women\'s organizations',
            'Legal aid is available for dowry-related cases',
        ],
    },
    {
        id: 'domestic',
        title: 'Domestic Violence (Prevention and Protection) Act, 2010',
        icon: '🏠',
        content: [
            'Protects women from physical, psychological, sexual, and economic abuse at home',
            'You can file a complaint against any family member causing domestic violence',
            'Protection orders can be issued to keep abusers away from you',
            'Temporary custody of children can be granted to the victim',
            'Emergency protection orders available for immediate safety',
            'Violation of protection orders is a criminal offense',
        ],
    },
    {
        id: 'harassment',
        title: 'Sexual Harassment Prevention Act, 2009',
        icon: '🚫',
        content: [
            'Protects women from sexual harassment in workplaces and public places',
            'Any unwelcome sexual behavior, comments, or advances is illegal',
            'You can file a complaint with the employer or directly with police',
            'Workplaces must have complaint committees for harassment cases',
            'Victims cannot be transferred or terminated for filing complaints',
            'Harassment in public transport is also covered under this law',
        ],
    },
    {
        id: 'reporting',
        title: 'Your Right to Report & File FIR',
        icon: '📞',
        content: [
            'You can file FIR (First Information Report) at ANY police station in Bangladesh',
            'Police CANNOT refuse to accept your complaint - it is your legal right',
            'You have the right to request a female police officer for your case',
            'You can file FIR even if the incident happened in a different district',
            'No time limit for filing FIR in cases of violence against women',
            'Your identity can be kept confidential if you request',
            'Free legal aid available through National Legal Aid Services (16430)',
        ],
    },
    {
        id: 'emergency',
        title: 'Emergency Legal Actions & Helplines',
        icon: '🚨',
        content: [
            'Emergency Helpline 999: For immediate police assistance',
            'Women & Child Helpline 109: 24/7 support for women in distress',
            'National Helpline for Violence Against Women 10921: Specialized help',
            'File FIR immediately - no delay required for violence cases',
            'Medical examination: Get examined within 24-72 hours for evidence',
            'Keep all evidence: messages, photos, videos, medical reports',
            'Contact NLASO (16430) or BLAST for free legal assistance',
        ],
    },
    {
        id: 'marriage',
        title: 'Marriage & Divorce Rights for Women',
        icon: '💍',
        content: [
            'You have the right to choose your spouse - forced marriage is illegal',
            'Minimum marriage age is 18 for women (Child Marriage Restraint Act)',
            'You can seek divorce on grounds of cruelty, desertion, or abuse',
            'Right to maintenance (alimony) after divorce',
            'Right to custody of children - courts consider child\'s best interest',
            'Polygamy requires consent of existing wife and court permission',
            'You have equal rights to property acquired during marriage',
        ],
    },
    {
        id: 'dosDonts',
        title: 'Important Do\'s & Don\'ts',
        icon: '✅',
        content: [
            'DO: Report immediately - delays can affect evidence collection',
            'DO: Write down all details of the incident while fresh in memory',
            'DO: Preserve all evidence (clothes, messages, photos, videos)',
            'DO: Get medical examination within 24-72 hours',
            'DO: Collect witness contact information if available',
            'DO: Request a female police officer if you feel uncomfortable',
            'DON\'T: Shower or change clothes before medical examination',
            'DON\'T: Delete any digital evidence (messages, photos)',
            'DON\'T: Feel pressured to withdraw your complaint',
            'DON\'T: Sign any documents without reading and understanding',
            'DON\'T: Accept money or settlement to drop the case',
        ],
    },
]

const importantNoticesData = [
    {
        type: 'info',
        title: 'Free Legal Aid Available',
        message: 'Contact National Legal Aid Services Organization (NLASO) at 16430 for free legal assistance. Available in all 64 districts of Bangladesh.',
    },
    {
        type: 'warning',
        title: 'Time-Sensitive: Medical Evidence',
        message: 'Medical examinations should be done within 24-72 hours for best evidence collection. Go to a government hospital for official medical report.',
    },
    {
        type: 'success',
        title: 'Your Rights Are Protected by Law',
        message: 'Police CANNOT refuse to file your FIR. If refused, contact Women & Child Helpline (109) or file complaint with higher police authority.',
    },
    {
        type: 'info',
        title: 'Fast-Track Courts',
        message: 'Cases of violence against women are heard in fast-track courts for quicker justice. Your case will be prioritized.',
    },
]

// Quiz questions for legal rights
const legalRightsQuizQuestions = [
    {
        question: 'What should you do if a police station refuses to file your FIR?',
        options: [
            'Go back home quietly',
            'Wait a few days and try again',
            'Contact Women & Child Helpline (109) or higher police authority',
            'Offer money to get the case filed',
        ],
        correctIndex: 2,
        explanation:
            'Police cannot refuse to file your FIR. If they do, you have the right to complain to higher authorities or call helplines like 109 for support.',
    },
    {
        question: 'What is the minimum legal age for marriage for women in Bangladesh?',
        options: ['16 years', '17 years', '18 years', '21 years'],
        correctIndex: 2,
        explanation:
            'Under the Child Marriage Restraint Act, the minimum legal age for marriage for women is 18 years.',
    },
    {
        question: 'Which law protects women from violence at home, including psychological and economic abuse?',
        options: [
            'Dowry Prohibition Act',
            'Domestic Violence (Prevention and Protection) Act, 2010',
            'Sexual Harassment Prevention Act, 2009',
            'Child Marriage Restraint Act',
        ],
        correctIndex: 1,
        explanation:
            'The Domestic Violence (Prevention and Protection) Act, 2010 specifically protects women from physical, psychological, sexual, and economic abuse at home.',
    },
    {
        question: 'What is true about dowry in Bangladesh?',
        options: [
            'It is a cultural custom and fully legal',
            'It is illegal to give or take dowry',
            'Only taking dowry is illegal, not giving',
            'Dowry is allowed if both families agree',
        ],
        correctIndex: 1,
        explanation:
            'Dowry is illegal in Bangladesh. Both giving and taking dowry are punishable offenses under the law.',
    },
    {
        question: 'How many police stations can legally accept your FIR?',
        options: [
            'Only the station in your home district',
            'Only the station where the incident occurred',
            'Any police station in Bangladesh',
            'Only special women’s police stations',
        ],
        correctIndex: 2,
        explanation:
            'You can file an FIR at any police station in Bangladesh, regardless of where the incident occurred.',
    },
    {
        question: 'Why is it important not to shower or change clothes before medical examination after an assault?',
        options: [
            'Because the hospital will not allow it',
            'To keep evidence like DNA and injuries intact',
            'Because it is disrespectful',
            'Because the law requires you to stay as you are',
        ],
        correctIndex: 1,
        explanation:
            'Not showering or changing clothes helps preserve physical evidence (like DNA, injuries, and traces) that support your legal case.',
    },
    {
        question: 'What kind of abuse is covered under the Sexual Harassment Prevention Act, 2009?',
        options: [
            'Only physical harassment in workplaces',
            'Only verbal comments on the street',
            'Any unwelcome sexual behavior, comments, or advances in workplaces and public places',
            'Only online harassment',
        ],
        correctIndex: 2,
        explanation:
            'The Sexual Harassment Prevention Act, 2009 covers all unwelcome sexual behavior, comments, or advances in workplaces and public spaces.',
    },
    {
        question: 'What support can National Legal Aid Services (NLASO – 16430) provide?',
        options: [
            'Only emotional counseling',
            'Free legal assistance across all districts',
            'Only support in the capital city',
            'Only medical support',
        ],
        correctIndex: 1,
        explanation:
            'NLASO (16430) provides free legal assistance in all 64 districts of Bangladesh to people who need legal support.',
    },
]

function LegalRightsScreen() {
    const navigation = useNavigation()
    const [expandedSections, setExpandedSections] = useState({})
    const [searchQuery, setSearchQuery] = useState('')
    const [showQuiz, setShowQuiz] = useState(false)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [selectedOptionIndex, setSelectedOptionIndex] = useState(null)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [score, setScore] = useState(0)
    const [completed, setCompleted] = useState(false)

    const quizQuestions = useMemo(() => {
        const shuffled = [...legalRightsQuizQuestions].sort(() => Math.random() - 0.5)
        return shuffled.slice(0, 5)
    }, [])

    const toggleSection = (id) => {
        setExpandedSections((prev) => ({
            ...prev,
            [id]: !prev[id],
        }))
    }

    // Filter legal rights based on search query
    const filteredLegalRights = useMemo(() => {
        if (!searchQuery.trim()) {
            return legalRightsData
        }

        const query = searchQuery.toLowerCase().trim()
        return legalRightsData.filter((section) => {
            // Search in title
            if (section.title.toLowerCase().includes(query)) {
                return true
            }
            // Search in content items
            return section.content.some((item) => item.toLowerCase().includes(query))
        })
    }, [searchQuery])

    // Filter important notices based on search query
    const filteredNotices = useMemo(() => {
        if (!searchQuery.trim()) {
            return importantNoticesData
        }

        const query = searchQuery.toLowerCase().trim()
        return importantNoticesData.filter((notice) => {
            return (
                notice.title.toLowerCase().includes(query) ||
                notice.message.toLowerCase().includes(query)
            )
        })
    }, [searchQuery])

    const totalQuestions = quizQuestions.length
    const currentQuestion = quizQuestions[currentQuestionIndex]

    const handleOptionSelect = (index) => {
        if (isSubmitted) return
        setSelectedOptionIndex(index)
    }

    const handleSubmitAnswer = () => {
        if (selectedOptionIndex === null || isSubmitted) return
        const isCorrect = selectedOptionIndex === currentQuestion.correctIndex
        if (isCorrect) {
            setScore((prev) => prev + 1)
        }
        setIsSubmitted(true)
    }

    const handleNextQuestion = () => {
        if (currentQuestionIndex + 1 >= totalQuestions) {
            setCompleted(true)
            return
        }
        setCurrentQuestionIndex((prev) => prev + 1)
        setSelectedOptionIndex(null)
        setIsSubmitted(false)
    }

    const handleRestartQuiz = () => {
        setShowQuiz(false)
        setCurrentQuestionIndex(0)
        setSelectedOptionIndex(null)
        setIsSubmitted(false)
        setScore(0)
        setCompleted(false)
    }

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0

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
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Text style={styles.backButtonText}>←</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quizButton}
                            onPress={() => {
                                setShowQuiz(true)
                                setCurrentQuestionIndex(0)
                                setSelectedOptionIndex(null)
                                setIsSubmitted(false)
                                setScore(0)
                                setCompleted(false)
                            }}
                        >
                            <Text style={styles.quizButtonText}>Quiz</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.titleRow}>
                        <Text style={styles.titleIcon}>⚖️</Text>
                        <Text style={styles.title}>Legal Rights</Text>
                    </View>
                    <Text style={styles.subtitle}>Know your rights and legal protections</Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search legal rights, laws, or protections..."
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

                {/* Important Notices */}
                {filteredNotices.length > 0 && (
                    <View style={styles.noticesContainer}>
                        {filteredNotices.map((notice, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.noticeCard,
                                    notice.type === 'info' && styles.noticeInfo,
                                    notice.type === 'warning' && styles.noticeWarning,
                                    notice.type === 'success' && styles.noticeSuccess,
                                ]}
                            >
                                <Text style={styles.noticeTitle}>{notice.title}</Text>
                                <Text style={styles.noticeMessage}>{notice.message}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Legal Rights Sections */}
                {filteredLegalRights.length > 0 ? (
                    <View style={styles.sectionsContainer}>
                        {filteredLegalRights.map((section) => (
                            <View key={section.id} style={styles.sectionCard}>
                                <TouchableOpacity
                                    style={styles.sectionHeader}
                                    onPress={() => toggleSection(section.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.sectionHeaderLeft}>
                                        <Text style={styles.sectionIcon}>{section.icon}</Text>
                                        <Text style={styles.sectionTitle}>{section.title}</Text>
                                    </View>
                                    <Text style={styles.expandIcon}>
                                        {expandedSections[section.id] ? '▼' : '▶'}
                                    </Text>
                                </TouchableOpacity>

                                {expandedSections[section.id] && (
                                    <View style={styles.sectionContent}>
                                        {section.content.map((item, index) => (
                                            <View key={index} style={styles.contentItem}>
                                                <Text style={styles.bullet}>•</Text>
                                                <Text style={styles.contentText}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyText}>No results found</Text>
                        <Text style={styles.emptyHint}>Try different keywords or clear your search</Text>
                    </View>
                )}
            </ScrollView>

            {/* Quiz Modal */}
            <Modal
                visible={showQuiz}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowQuiz(false)}
            >
                <View style={styles.quizModalOverlay}>
                    <View style={styles.quizModalContent}>
                        <View style={styles.quizHeaderRow}>
                            <Text style={styles.quizTitle}>Legal Rights Quiz</Text>
                            <TouchableOpacity onPress={() => setShowQuiz(false)} style={styles.quizCloseButton}>
                                <Text style={styles.quizCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {!completed ? (
                            <>
                                <Text style={styles.quizProgress}>
                                    Question {currentQuestionIndex + 1} of {totalQuestions}
                                </Text>
                                <Text style={styles.quizQuestion}>{currentQuestion.question}</Text>

                                {currentQuestion.options.map((option, index) => {
                                    const isCorrect = index === currentQuestion.correctIndex
                                    const isSelected = index === selectedOptionIndex
                                    let optionStyle = styles.quizOption
                                    if (isSubmitted) {
                                        if (isCorrect) {
                                            optionStyle = [styles.quizOption, styles.quizOptionCorrect]
                                        } else if (isSelected && !isCorrect) {
                                            optionStyle = [styles.quizOption, styles.quizOptionIncorrect]
                                        }
                                    } else if (isSelected) {
                                        optionStyle = [styles.quizOption, styles.quizOptionSelected]
                                    }

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={optionStyle}
                                            onPress={() => handleOptionSelect(index)}
                                            disabled={isSubmitted}
                                        >
                                            <Text style={styles.quizOptionText}>{option}</Text>
                                        </TouchableOpacity>
                                    )
                                })}

                                {isSubmitted && (
                                    <View style={styles.quizExplanationBox}>
                                        <Text style={styles.quizExplanationTitle}>Why this is correct</Text>
                                        <Text style={styles.quizExplanationText}>
                                            {currentQuestion.explanation}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.quizFooterRow}>
                                    {!isSubmitted ? (
                                        <TouchableOpacity
                                            style={[
                                                styles.quizPrimaryButton,
                                                selectedOptionIndex === null && styles.quizButtonDisabled,
                                            ]}
                                            onPress={handleSubmitAnswer}
                                            disabled={selectedOptionIndex === null}
                                        >
                                            <Text style={styles.quizPrimaryButtonText}>Submit</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.quizPrimaryButton}
                                            onPress={handleNextQuestion}
                                        >
                                            <Text style={styles.quizPrimaryButtonText}>
                                                {currentQuestionIndex + 1 === totalQuestions ? 'View Results' : 'Next'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        ) : (
                            <View style={styles.quizResultsContainer}>
                                <Text style={styles.quizResultsTitle}>Quiz Results</Text>
                                <Text style={styles.quizResultsScore}>
                                    You scored {score} out of {totalQuestions}
                                </Text>
                                <Text style={styles.quizResultsPercentage}>{percentage}% correct</Text>
                                <Text style={styles.quizResultsNote}>
                                    Review the legal rights sections above to deepen your understanding.
                                </Text>
                                <TouchableOpacity style={styles.quizPrimaryButton} onPress={handleRestartQuiz}>
                                    <Text style={styles.quizPrimaryButtonText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        )}
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
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    quizButton: {
        paddingHorizontal: theme.spacing.base,
        paddingVertical: 6,
        borderRadius: 20,

        backgroundColor: theme.colors.primary,
        ...theme.shadows.sm,
    },
    quizButtonText: {
        color: '#fff',
        fontWeight: theme.fonts.weights.semibold,
        fontSize: theme.fonts.sizes.sm,
        marginTop: -5,
    },
    noticesContainer: {
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    noticeCard: {
        borderRadius: 12,
        padding: theme.spacing.base,
        // ...theme.shadows.sm,
    },
    noticeInfo: {
        backgroundColor: 'rgba(74, 152, 216, 0.13)',
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    noticeWarning: {
        backgroundColor: 'rgba(151, 104, 35, 0.1)',
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800',
    },
    noticeSuccess: {
        backgroundColor: 'rgba(20, 168, 25, 0.1)',
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    noticeTitle: {
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        marginBottom: 4,
    },
    noticeMessage: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        lineHeight: 20,
    },
    sectionsContainer: {
        gap: theme.spacing.md,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        ...theme.shadows.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.base,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
    },
    sectionIcon: {
        fontSize: 23,
    },
    sectionTitle: {
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        flex: 1,
    },
    expandIcon: {
        fontSize: 14,
        color: theme.colors.textMuted,
    },
    sectionContent: {
        padding: theme.spacing.base,
        paddingTop: 0,
        backgroundColor: '#FAFAFA',
    },
    contentItem: {
        flexDirection: 'row',
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    bullet: {
        fontSize: 16,
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    contentText: {
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
    quizModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    quizModalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 420,
        padding: theme.spacing.lg,
    },
    quizHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    quizTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
    },
    quizCloseButton: {
        padding: 6,
    },
    quizCloseText: {
        fontSize: 20,
        color: theme.colors.textMuted,
    },
    quizProgress: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.sm,
    },
    quizQuestion: {
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.md,
    },
    quizOption: {
        paddingVertical: 10,
        paddingHorizontal: theme.spacing.base,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: theme.spacing.sm,
        backgroundColor: '#FFFFFF',
    },
    quizOptionSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(255, 77, 110, 0.08)',
    },
    quizOptionCorrect: {
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.12)',
    },
    quizOptionIncorrect: {
        borderColor: '#F44336',
        backgroundColor: 'rgba(244, 67, 54, 0.12)',
    },
    quizOptionText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textDark,
    },
    quizExplanationBox: {
        marginTop: theme.spacing.md,
        padding: theme.spacing.base,
        borderRadius: 10,
        backgroundColor: 'rgba(33, 150, 243, 0.08)',
    },
    quizExplanationTitle: {
        fontSize: theme.fonts.sizes.sm,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.textDark,
        marginBottom: 4,
    },
    quizExplanationText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        lineHeight: 20,
    },
    quizFooterRow: {
        marginTop: theme.spacing.lg,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    quizPrimaryButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: theme.colors.primary,
    },
    quizPrimaryButtonText: {
        color: '#fff',
        fontWeight: theme.fonts.weights.semibold,
        fontSize: theme.fonts.sizes.sm,
    },
    quizButtonDisabled: {
        backgroundColor: '#BDBDBD',
    },
    quizResultsContainer: {
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
    },
    quizResultsTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.sm,
    },
    quizResultsScore: {
        fontSize: theme.fonts.sizes.base,
        color: theme.colors.textDark,
        marginBottom: 4,
    },
    quizResultsPercentage: {
        fontSize: theme.fonts.sizes.base,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.primary,
        marginBottom: theme.spacing.md,
    },
    quizResultsNote: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
})

export default LegalRightsScreen

