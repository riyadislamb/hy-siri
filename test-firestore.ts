import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDjcDwMa4UCmPakCACVaFx6snD19yYSgT4",
  authDomain: "gen-lang-client-0956700047.firebaseapp.com",
  projectId: "gen-lang-client-0956700047",
  storageBucket: "gen-lang-client-0956700047.firebasestorage.app",
  messagingSenderId: "332443005202",
  appId: "1:332443005202:web:aa9c7adc68066fd497c3cb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    console.log("Fetching dishes...");
    const snap = await getDocs(collection(db, 'dishes'));
    console.log("Success! Found", snap.docs.length, "dishes.");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
test();
