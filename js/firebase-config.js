/* ==========================================================================
   MOVELPRO - FIREBASE CONFIGURATION & INITIALIZATION
   Firebase Auth, Firestore & Role Definitions
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDQGR_1c_QefoQMcGGLDQ-_DyOea7h7nPA",
  authDomain: "rafael-rs-moveis.firebaseapp.com",
  projectId: "rafael-rs-moveis",
  storageBucket: "rafael-rs-moveis.firebasestorage.app",
  messagingSenderId: "387325159158",
  appId: "1:387325159158:web:72402e53e5ecc033ee2ed7",
  measurementId: "G-3WDMJ7V56G"
};

// Admin emails defined by the user
const ADMIN_EMAILS = [
  'brisasofc@gmail.com',
  'rsmoveismontador@gmail.com'
];

// Initialize Firebase App
let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;

try {
  if (typeof firebase !== 'undefined') {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firestoreDb = firebase.firestore();

    // Enable offline persistence for Firestore if available
    firestoreDb.enablePersistence({ synchronizeTabs: true }).catch(err => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence falhou: múltiplas abas abertas.');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence não suportada pelo navegador.');
      }
    });

    console.log('Firebase inicializado com sucesso.');
  } else {
    console.warn('SDK do Firebase não encontrado no escopo global.');
  }
} catch (e) {
  console.error('Erro ao inicializar Firebase:', e);
}

window.firebaseConfig = firebaseConfig;
window.ADMIN_EMAILS = ADMIN_EMAILS;
window.firebaseAuth = firebaseAuth;
window.firestoreDb = firestoreDb;
