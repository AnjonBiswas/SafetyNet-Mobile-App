import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useDrawer } from '../context/DrawerContext'
import Ionicons from 'react-native-vector-icons/Ionicons'
import NotificationBadge from './NotificationBadge'
import { useBadgeCounts } from '../hooks/useBadgeCounts'
import theme from '../utils/theme'

function BottomNav() {
  const navigation = useNavigation()
  const { openDrawer } = useDrawer()
  const { unreadMessagesCount } = useBadgeCounts()

  // Debug: Log badge count
  React.useEffect(() => {
    if (unreadMessagesCount > 0) {
      console.log('[BottomNav] 🎯 Chat badge should show:', unreadMessagesCount);
    }
  }, [unreadMessagesCount]);

  return (
    <View style={styles.navBar}>
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Dashboard')}>
        <Image source={require('../../assets/Home_icon_active.png')} style={styles.navIconActive} />
        <Text style={styles.navLabelActive}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('SafeMap')}>
        <Image source={require('../../assets/safezone_icon.png')} style={styles.navIcon} />
        <Text style={styles.navLabel}>Safe Map</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Chat')}>
        <View style={{ position: 'relative', width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="chatbubbles-outline" size={28} color={theme.colors.textMuted} style={styles.navIconIonicons} />
          <NotificationBadge count={unreadMessagesCount} />
        </View>
        <Text style={styles.navLabel}>Chat</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={openDrawer}>
        <Image source={require('../../assets/menu_icon.png')} style={styles.navIcon} />
        <Text style={styles.navLabel}>Menu</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    backgroundColor: '#fff',
    ...theme.shadows.md,
  },
  navItem: {
    alignItems: 'center',
  },
  navIconActive: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  navLabelActive: { fontSize: theme.fonts.sizes.sm, color: theme.colors.primary, marginTop: 2 },
  navIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    opacity: .8,
  },
  navIconIonicons: {
    opacity: .99,
  },
  navLabel: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textMuted, marginTop: 2 },
})

export default BottomNav
