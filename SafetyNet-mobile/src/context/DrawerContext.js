import React, { createContext, useState, useContext } from 'react'

const DrawerContext = createContext(null)

/**
 * Drawer Provider Component
 * Manages drawer open/close state globally
 */
export function DrawerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)

  const openDrawer = () => setIsOpen(true)
  const closeDrawer = () => setIsOpen(false)
  const toggleDrawer = () => setIsOpen((prev) => !prev)

  const value = {
    isOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  }

  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
}

/**
 * Custom hook to use Drawer Context
 */
export function useDrawer() {
  const context = useContext(DrawerContext)
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider')
  }
  return context
}

export default DrawerContext



