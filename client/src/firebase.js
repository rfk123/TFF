import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyCzEX326Nu9G3DFocW3H9BE6j6h0cbX_HA",
//   authDomain: "trent-family-farms.firebaseapp.com",
//   projectId: "trent-family-farms",
//   storageBucket: "trent-family-farms.appspot.com",
//   messagingSenderId: "59362651991",
//   appId: "1:59362651991:web:de497c30fcae0ae49c1812",
//   measurementId: "G-NVH5EKK5FW"
// };
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Check if the current user is an admin
export const checkIfAdmin = async (uid) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const userData = userSnap.data();
    return userData.role === "admin";  // Check if user has the 'admin' role
  }
  return false;
};

// Save new user role (e.g., admin)
export const setAdminRole = async (uid) => {
  await setDoc(doc(db, "users", uid), { role: "admin" }, { merge: true }); // Merge ensures we don't overwrite existing data
};

export default app;

