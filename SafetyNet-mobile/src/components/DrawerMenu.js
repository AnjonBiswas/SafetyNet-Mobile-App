import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Platform,
    StatusBar,
    Image,
} from 'react-native'
import { BlurView } from 'expo-blur'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Extrapolate,
    runOnJS,
} from 'react-native-reanimated'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useDrawer } from '../context/DrawerContext'
import { useAuth } from '../context/AuthContext'
import { useNavigation } from '@react-navigation/native'
import profileService from '../services/profileService'
import theme from '../utils/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const DRAWER_WIDTH = SCREEN_WIDTH > 600 ? 320 : SCREEN_WIDTH * 0.85
const DRAWER_ANIMATION_DURATION = 300

// Color palette
const colors = {
    primary: '#E91E63',
    secondary: '#9C27B0',
    accent: '#00BCD4',
    dark: '#1a1a1a',
    light: '#ffffff',
    gray: '#6b7280',
    grayLight: '#f3f4f6',
    grayDark: '#374151',
    overlay: 'rgba(0, 0, 0, 0.5)',
}

// Menu structure
const menuItems = [
    {
        id: 'profile',
        title: 'Profile',
        icon: 'person',
        iconType: 'ionicons',
        children: [
            { id: 'view-profile', title: 'View Profile', route: 'ViewProfile' },
            { id: 'edit-profile', title: 'Edit Profile', route: 'EditProfile' },
            { id: 'trusted-contacts', title: 'Trusted Contacts', route: 'TrustedContacts' },
        ],
    },
    {
        id: 'safety-tools',
        title: 'Safety Tools',
        icon: 'shield-checkmark',
        iconType: 'ionicons',
        children: [
            { id: 'safety-resources', title: 'Safety Resources', route: 'SafetyResources' },
            { id: 'self-defense', title: 'Self-Defense Tips', route: 'SelfDefenseTips' },
            {
                id: 'safety-quiz',
                title: 'Safety Awareness Quiz',
                route: 'SafetyQuiz',
                badge: { type: 'star', color: '#FFD700' },
            },
        ],
    },
    {
        id: 'reports',
        title: 'Reports',
        icon: 'description',
        iconType: 'material',
        children: [
            { id: 'my-reports', title: 'My Reports', route: 'MyReports' },
            {
                id: 'analytics',
                title: 'Analytics',
                route: 'Analytics',
                badge: { type: 'chart', color: colors.accent },
            },
        ],
    },
    {
        id: 'safetynet-parent',
        title: 'SafetyNet-Parent',
        icon: 'people-circle',
        iconType: 'ionicons',
        children: [
            { id: 'add-parent', title: 'Add Parent', route: 'Parents' },
        ],
    },
    {
        id: 'settings',
        title: 'Settings',
        icon: 'settings',
        iconType: 'material',
        children: [
            { id: 'app-settings', title: 'App Settings', route: 'AppSettings' },
            {
                id: 'privacy-security',
                title: 'Privacy & Security',
                route: 'PrivacySecurity',
                badge: { type: 'shield', color: colors.primary },
            },
            {
                id: 'language',
                title: 'Language Selection',
                route: 'LanguageSelection',
                showLanguage: true,
            },
        ],
    },
    {
        id: 'help-support',
        title: 'Help & Support',
        icon: 'help-circle',
        iconType: 'ionicons',
        children: [
            { id: 'faq', title: 'FAQ', route: 'FAQ' },
            {
                id: 'contact-support',
                title: 'Contact Support',
                route: 'ContactSupport',
                badge: { type: 'external', color: colors.gray },
            },
            { id: 'report-bug', title: 'Report a Bug', route: 'ReportBug' },
        ],
    },


]

/**
 * Drawer Menu Component
 * Premium side drawer with smooth animations and expandable sections
 */
function DrawerMenu() {
    const { isOpen, closeDrawer } = useDrawer()
    const { user, logout } = useAuth()
    const navigation = useNavigation()
    const insets = useSafeAreaInsets()

    const [expandedSections, setExpandedSections] = useState(new Set())
    const [currentRoute, setCurrentRoute] = useState('Dashboard')
    const [language, setLanguage] = useState('English') // 'English' or 'বাংলা'
    const [profileImage, setProfileImage] = useState(null)

    // Animation values - drawer slides from right to left
    const translateX = useSharedValue(DRAWER_WIDTH)
    const opacity = useSharedValue(0)

    // Load profile image when drawer opens
    useEffect(() => {
        if (isOpen) {
            loadProfileImage()
        }
    }, [isOpen])

    // Load profile image
    const loadProfileImage = async () => {
        try {
            const result = await profileService.getProfile()
            if (result.success && result.data?.profileImage) {
                setProfileImage(result.data.profileImage)
            } else {
                setProfileImage(null)
            }
        } catch (error) {
            console.error('Error loading profile image:', error)
            setProfileImage(null)
        }
    }

    // Update animation when drawer state changes
    useEffect(() => {
        if (isOpen) {
            translateX.value = withSpring(0, {
                damping: 20,
                stiffness: 90,
            })
            opacity.value = withTiming(1, { duration: DRAWER_ANIMATION_DURATION })
        } else {
            translateX.value = withSpring(DRAWER_WIDTH, {
                damping: 20,
                stiffness: 90,
            })
            opacity.value = withTiming(0, { duration: DRAWER_ANIMATION_DURATION })
        }
    }, [isOpen])

    // Animated styles
    const drawerAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        }
    })

    const backdropAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        }
    })

    // Gesture handler for swipe to close (right to left swipe) - less sensitive
    const panGesture = Gesture.Pan()
        .activeOffsetX(15) // Only activate if swiping right (positive X) at least 10px
        .failOffsetY([-15, 15]) // Fail if vertical movement is too much (user is scrolling menu)
        .onUpdate((event) => {
            // Only track horizontal swipe, ignore if too much vertical movement (scrolling)
            if (Math.abs(event.translationY) < Math.abs(event.translationX) && event.translationX > 0) {
                translateX.value = Math.min(DRAWER_WIDTH, event.translationX)
                opacity.value = interpolate(
                    translateX.value,
                    [0, DRAWER_WIDTH],
                    [1, 0],
                    Extrapolate.CLAMP
                )
            }
        })
        .onEnd((event) => {
            // Require more swipe distance (50% instead of 30%) and higher velocity (1000 instead of 500)
            // Also check that horizontal movement is greater than vertical (not scrolling)
            const isHorizontalSwipe = Math.abs(event.translationX) > Math.abs(event.translationY)
            if (isHorizontalSwipe && (event.translationX > DRAWER_WIDTH * 0.5 || event.velocityX > 1000)) {
                translateX.value = withSpring(DRAWER_WIDTH)
                opacity.value = withTiming(0)
                runOnJS(closeDrawer)()
            } else {
                translateX.value = withSpring(0)
                opacity.value = withTiming(1)
            }
        })

    // Toggle section expansion with accordion behavior (only one section open at a time)
    const toggleSection = (sectionId) => {
        setExpandedSections((prev) => {
            const next = new Set()
            // If clicking the same section, close it. Otherwise, close all and open the new one
            if (!prev.has(sectionId)) {
                next.add(sectionId)
            }
            return next
        })
    }

    // Handle menu item press
    const handleItemPress = (route) => {
        if (route) {
            navigation.navigate(route)
            closeDrawer()
        }
    }

    // Handle logout
    const handleLogout = async () => {
        closeDrawer()
        await logout()
    }

    // Get user initials for avatar
    const getUserInitials = () => {
        if (!user?.name) return 'U'
        const parts = user.name.trim().split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return user.name.substring(0, 2).toUpperCase()
    }

    // Get trust score (mock - replace with real data)
    const trustScore = 85

    // Render icon
    const renderIcon = (iconName, iconType, size = 24) => {
        const IconComponent = iconType === 'material' ? MaterialIcons : Ionicons
        return <IconComponent name={iconName} size={size} color={colors.grayDark} />
    }

    // Render badge
    const renderBadge = (badge) => {
        if (!badge) return null

        switch (badge.type) {
            case 'star':
                return (
                    <View style={styles.badgeContainer}>
                        <Ionicons name="star" size={12} color={badge.color} />
                    </View>
                )
            case 'chart':
                return (
                    <View style={styles.badgeContainer}>
                        <Ionicons name="bar-chart" size={12} color={badge.color} />
                    </View>
                )
            case 'shield':
                return (
                    <View style={styles.badgeContainer}>
                        <Ionicons name="shield" size={12} color={badge.color} />
                    </View>
                )
            case 'external':
                return (
                    <View style={styles.badgeContainer}>
                        <Ionicons name="open-outline" size={10} color={badge.color} />
                    </View>
                )
            default:
                return null
        }
    }

    // Render menu item
    const renderMenuItem = (item, level = 0) => {
        const isExpanded = expandedSections.has(item.id)
        const hasChildren = item.children && item.children.length > 0
        const isActive = currentRoute === item.route

        if (hasChildren) {
            // Parent item with children
            return (
                <View key={item.id}>
                    <TouchableOpacity
                        style={[styles.menuItem, level > 0 && styles.menuItemChild]}
                        onPress={() => toggleSection(item.id)}
                        activeOpacity={0.7}
                        accessibilityLabel={`${item.title} menu section`}
                        accessibilityRole="button"
                    >
                        <View style={styles.menuItemLeft}>
                            {renderIcon(item.icon, item.iconType)}
                            <Text style={[styles.menuItemText, styles.menuItemTextBold]}>{item.title}</Text>
                        </View>
                        <Animated.View
                            style={[
                                styles.chevronContainer,
                                {
                                    transform: [{ rotate: `${isExpanded ? 90 : 0}deg` }],
                                },
                            ]}
                        >
                            <Ionicons name="chevron-forward" size={18} color={colors.gray} />
                        </Animated.View>
                    </TouchableOpacity>

                    {/* Children items */}
                    {isExpanded && (
                        <View style={styles.childrenContainer}>
                            {item.children.map((child) => {
                                const childIsActive = currentRoute === child.route
                                return (
                                    <TouchableOpacity
                                        key={child.id}
                                        style={[
                                            styles.menuItem,
                                            styles.menuItemChild,
                                            childIsActive && styles.menuItemActive,
                                        ]}
                                        onPress={() => handleItemPress(child.route)}
                                        activeOpacity={0.7}
                                        accessibilityLabel={`${child.title} menu item`}
                                        accessibilityRole="button"
                                    >
                                        {childIsActive && <View style={styles.activeIndicator} />}
                                        <View style={styles.menuItemLeft}>
                                            <Text
                                                style={[
                                                    styles.menuItemText,
                                                    styles.menuItemTextChild,
                                                    childIsActive && styles.menuItemTextActive,
                                                ]}
                                            >
                                                {child.title}
                                            </Text>
                                        </View>
                                        {child.showLanguage && (
                                            <View style={styles.languageContainer}>
                                                <Text style={styles.languageText}>
                                                    {language === 'English' ? '🇬🇧' : '🇧🇩'} {language} ▼
                                                </Text>
                                            </View>
                                        )}
                                        {renderBadge(child.badge)}
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    )}
                </View>
            )
        } else {
            // Simple menu item
            return (
                <TouchableOpacity
                    key={item.id}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => handleItemPress(item.route)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${item.title} menu item`}
                    accessibilityRole="button"
                >
                    {isActive && <View style={styles.activeIndicator} />}
                    <View style={styles.menuItemLeft}>
                        {renderIcon(item.icon, item.iconType)}
                        <Text
                            style={[styles.menuItemText, isActive && styles.menuItemTextActive]}
                        >
                            {item.title}
                        </Text>
                    </View>
                    {renderBadge(item.badge)}
                </TouchableOpacity>
            )
        }
    }

    if (!isOpen && translateX.value === DRAWER_WIDTH) {
        return null
    }

    return (
        <>
            {/* Backdrop with 70% blur */}
            <Animated.View
                style={[
                    styles.backdrop,
                    backdropAnimatedStyle,
                    { paddingTop: insets.top, paddingBottom: insets.bottom },
                ]}
                pointerEvents={isOpen ? 'auto' : 'none'}
            >
                <BlurView
                    intensity={70}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={closeDrawer}
                    accessibilityLabel="Close drawer"
                    accessibilityRole="button"
                />
            </Animated.View>

            {/* Drawer */}
            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={[
                        styles.drawer,
                        drawerAnimatedStyle,
                        { paddingTop: insets.top + 10, paddingBottom: insets.bottom },
                    ]}
                >
                    <ScrollView
                        style={styles.drawerContent}
                        contentContainerStyle={styles.drawerContentContainer}
                        showsVerticalScrollIndicator={true}
                        bounces={true}
                        scrollEnabled={true}
                    >
                        {/* User Profile Header */}
                        <View style={styles.profileHeader}>
                            <View style={styles.avatarContainer}>
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                                ) : (
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{getUserInitials()}</Text>
                                    </View>
                                )}
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                </View>
                            </View>
                            <Text style={styles.userName}>{user?.name || 'User'}</Text>
                            <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>

                            {/* Trust Score Circle */}
                            <View style={styles.trustScoreContainer}>
                                <View style={styles.trustScoreCircle}>
                                    <Text style={styles.trustScoreText}>{trustScore}</Text>
                                    <Text style={styles.trustScoreLabel}>Trust</Text>
                                </View>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Menu Items */}
                        <View style={styles.menuContainer}>
                            {menuItems.map((item) => renderMenuItem(item))}
                        </View>

                        {/* Bottom Section */}
                        <View style={styles.bottomSection}>
                            <Text style={styles.versionText}>v1.0.0</Text>
                            <TouchableOpacity
                                style={styles.logoutButton}
                                onPress={handleLogout}
                                activeOpacity={0.7}
                                accessibilityLabel="Logout"
                                accessibilityRole="button"
                            >
                                <Ionicons name="log-out-outline" size={20} color={colors.error || '#dc3545'} />
                                <Text style={styles.logoutText}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>
            </GestureDetector>
        </>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
    },
    drawer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        backgroundColor: colors.light,
        zIndex: 1000,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: -2, height: 0 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    drawerContent: {
        flex: 1,
    },
    drawerContentContainer: {
        paddingBottom: 20,
        flexGrow: 1,
    },
    profileHeader: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.light,
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: colors.light,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.light,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.light,
        borderRadius: 12,
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.dark,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: colors.gray,
        marginBottom: 16,
    },
    trustScoreContainer: {
        marginTop: 8,
    },
    trustScoreCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.grayLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
    },
    trustScoreText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
    },
    trustScoreLabel: {
        fontSize: 10,
        color: colors.gray,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: colors.grayLight,
        marginHorizontal: 20,
        marginVertical: 8,
    },
    menuContainer: {
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginVertical: 2,
        position: 'relative',
    },
    menuItemChild: {
        paddingLeft: 48,
    },
    menuItemActive: {
        backgroundColor: colors.grayLight,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: colors.primary,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuItemText: {
        fontSize: 16,
        color: colors.dark,
        marginLeft: 12,
        fontWeight: '400',
    },
    menuItemTextBold: {
        fontWeight: '600',
        fontSize: 17,
    },
    menuItemTextChild: {
        fontSize: 15,
    },
    menuItemTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    chevronContainer: {
        marginLeft: 8,
    },
    childrenContainer: {
        marginLeft: 12,
        marginTop: 4,
    },
    badgeContainer: {
        marginLeft: 8,
        padding: 4,
    },
    languageContainer: {
        marginLeft: 8,
    },
    languageText: {
        fontSize: 14,
        color: colors.gray,
    },
    bottomSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.grayLight,
        marginTop: 20,
    },
    versionText: {
        fontSize: 12,
        color: colors.gray,
        marginBottom: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: colors.grayLight,
    },
    logoutText: {
        fontSize: 16,
        color: colors.error || '#dc3545',
        fontWeight: '600',
        marginLeft: 8,
    },
})

export default DrawerMenu

