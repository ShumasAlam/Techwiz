/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const CompareContext = createContext(null)
const MAX_COMPARE = 4

export function CompareProvider({ children }) {
  const [items, setItems] = useState([])

  // Feature 4: Sync compare items from server on login
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('marketlink_session'))
      if (session?.user?.id) {
        api.users.getCompare(session.user.id).then(res => {
          if (res?.products && res.products.length) {
            setItems(res.products)
          }
        }).catch(() => {})
      }
    } catch { /* ignore */ }
  }, [])

  const addItem = (product) => {
    try {
      const session = JSON.parse(localStorage.getItem('marketlink_session'))
      if (session?.user?.id) {
        api.users.toggleCompare(session.user.id, product.id).catch(() => {})
      }
    } catch { /* ignore */ }

    setItems((current) => {
      if (current.some((item) => item.id === product.id)) return current
      if (current.length && current[0].comparisonGroup !== product.comparisonGroup) {
        return [product]
      }
      return [...current, product].slice(0, MAX_COMPARE)
    })
  }

  const removeItem = (id) => {
    try {
      const session = JSON.parse(localStorage.getItem('marketlink_session'))
      if (session?.user?.id) {
        api.users.toggleCompare(session.user.id, id).catch(() => {})
      }
    } catch { /* ignore */ }
    setItems((current) => current.filter((item) => item.id !== id))
  }

  const clear = () => {
    try {
      const session = JSON.parse(localStorage.getItem('marketlink_session'))
      if (session?.user?.id) {
        api.users.clearCompare(session.user.id).catch(() => {})
      }
    } catch { /* ignore */ }
    setItems([])
  }

  const isComparing = (id) => items.some((item) => item.id === id)

  const value = { items, addItem, removeItem, clear, isComparing, max: MAX_COMPARE }
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
}

export const useCompare = () => useContext(CompareContext)
