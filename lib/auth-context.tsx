"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInAnonymously,
} from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"

interface User {
  id: string
  email: string
  name?: string
  isAnonymous?: boolean
}

interface AuthContextType {
  user: User | null
  login: () => Promise<boolean>
  loginAnonymously: () => Promise<boolean>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const googleProvider = new GoogleAuthProvider()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Monitor auth state changes (Single source of truth for user state)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User logged in (Google or Anonymous)
        const userDocRef = doc(db, "users", firebaseUser.uid)
        const userDocSnap = await getDoc(userDocRef)

        if (!userDocSnap.exists()) {
          // Create user document if it doesn't exist
          const userData = {
            id: firebaseUser.uid,
            email: firebaseUser.email || `anonymous_${firebaseUser.uid}`,
            name: firebaseUser.displayName || "Anonymous User",
            isAnonymous: firebaseUser.isAnonymous,
            characterCount: 0,
            createdAt: serverTimestamp(),
          }
          await setDoc(userDocRef, userData)
        }

        // Set React state
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || "Anonymous User",
          name: firebaseUser.displayName || undefined,
          isAnonymous: firebaseUser.isAnonymous,
        })
      } else {
        // User logged out
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (): Promise<boolean> => {
    try {
      await signInWithPopup(auth, googleProvider)
      // onAuthStateChanged will handle the rest
      return true
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const loginAnonymously = async (): Promise<boolean> => {
    try {
      await signInAnonymously(auth)
      // onAuthStateChanged will handle the rest
      return true
    } catch (error) {
      console.error("Anonymous login error:", error)
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth)
      setUser(null)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, loginAnonymously, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

