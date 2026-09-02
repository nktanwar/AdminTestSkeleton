type FirebaseUser = {
  email?: string | null
  getIdToken?: (forceRefresh?: boolean) => Promise<string>
}

type FirebaseAuthLike = {
  currentUser?: FirebaseUser | null
}

type FirebaseGlobal = {
  auth?: (() => FirebaseAuthLike) | FirebaseAuthLike
}

declare global {
  interface Window {
    firebase?: FirebaseGlobal
    firebaseAuth?: FirebaseAuthLike
  }
}

function getCurrentUserFromGlobalFirebase(): FirebaseUser | null {
  const auth = window.firebaseAuth
  if (auth?.currentUser) return auth.currentUser

  const firebaseAuth = window.firebase?.auth
  if (!firebaseAuth) return null

  const resolvedAuth =
    typeof firebaseAuth === "function"
      ? firebaseAuth()
      : firebaseAuth

  return resolvedAuth.currentUser ?? null
}

export function getCurrentFirebaseEmail(): string | null {
  return getCurrentUserFromGlobalFirebase()?.email ?? null
}

export async function getFreshFirebaseIdToken(): Promise<string | null> {
  const currentUser = getCurrentUserFromGlobalFirebase()
  if (!currentUser?.getIdToken) return null
  return currentUser.getIdToken(true)
}
