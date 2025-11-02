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
import { doc, setDoc, getDoc } from "firebase/firestore"

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

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Check if user document exists, if not create it
        const userDocRef = doc(db, "users", firebaseUser.uid)
        const userDocSnap = await getDoc(userDocRef)

        if (!userDocSnap.exists()) {
          // Create user document if it doesn't exist
          await setDoc(userDocRef, {
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            characterCount: 0,
            createdAt: new Date(),
          })
        }

        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || undefined,
          isAnonymous: firebaseUser.isAnonymous,
        })
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (): Promise<boolean> => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const userCredential = result.user

      // Create user document if it doesn't exist
      const userDocRef = doc(db, "users", userCredential.uid)
      const userDocSnap = await getDoc(userDocRef)

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          id: userCredential.uid,
          email: userCredential.email || "",
          characterCount: 0,
          createdAt: new Date(),
        })
      }

      setUser({
        id: userCredential.uid,
        email: userCredential.email || "",
        name: userCredential.displayName || undefined,
        isAnonymous: false,
      })
      return true
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const loginAnonymously = async (): Promise<boolean> => {
    try {
      const result = await signInAnonymously(auth)
      const userCredential = result.user

      // Create user document if it doesn't exist
      const userDocRef = doc(db, "users", userCredential.uid)
      const userDocSnap = await getDoc(userDocRef)

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          id: userCredential.uid,
          email: `anonymous_${userCredential.uid}`,
          characterCount: 0,
          createdAt: new Date(),
          isAnonymous: true,
        })
      }

      setUser({
        id: userCredential.uid,
        email: `Anonymous User`,
        isAnonymous: true,
      })
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

