// 1. ייבוא הספריות ישירות מגוגל
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// 2. הגדרות הפרויקט (רק פעם אחת!)
const firebaseConfig = {
  apiKey: "AIzaSyCByvoHlq6K8UZmfO5MoYSjSA5DwJWaDn4",
  authDomain: "yehoshua-system.firebaseapp.com",
  projectId: "yehoshua-system",
  storageBucket: "yehoshua-system.firebasestorage.app",
  messagingSenderId: "233499815606",
  appId: "1:233499815606:web:1445807090092403f3c017",
  measurementId: "G-2CFNKDHPE8"
};

// 3. אתחול המערכת
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// 4. פונקציה לשמירה לענן
export async function syncToCloud(data) {
    try {
        // שומר תחת משתמש בשם 'default_user' (אפשר לשנות בעתיד)
        await setDoc(doc(db, "users", "default_user"), {
            userData: JSON.stringify(data),
            lastUpdated: new Date()
        });
        console.log("הנתונים נשמרו בענן בהצלחה!");
    } catch (e) {
        console.error("שגיאה בשמירה לענן: ", e);
    }
}

// 5. פונקציה למשיכת נתונים מהענן
export async function loadFromCloud() {
    try {
        const docRef = doc(db, "users", "default_user");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return JSON.parse(docSnap.data().userData);
        }
        return null;
    } catch (e) {
        console.error("שגיאה במשיכת נתונים: ", e);
        return null;
    }
}