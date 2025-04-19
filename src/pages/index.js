/* Last Name, First Name - Student ID */
/* 
 Suresh, Kaushick ( 1002237680 ), 
 Sivaprakash, Akshay Prassanna ( 1002198274 ) ,  
 Sonwane, Pratik ( 1002170610 ) , 
 Shaik, Arfan ( 1002260039 ) , 
 Sheth, Jeet ( 1002175315 ) 
*/
import { useEffect, useState } from 'react';
import Profile from "D:\web data management\Project\fitness-tracker-app\src\components\Profile.js";

import { onAuthStateChanged } from "D:\web data management\Project\fitness-tracker-app\node_modules\@firebase\auth";

import { auth } from "D:\web data management\Project\fitness-tracker-app\src\components\firebase.js"; // path to your firebase.js
/*
export default function Home() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.email) return;
      const email = session?.user?.email;
      const res = await fetch(`/api/profile?email=${session.user.email}`);
      const data = await res.json();
      const { data: session } = useSession();
      
      setUserData(data);
    };
  
    fetchProfile();
  }, [session]);
  

  return (
    <div>
      {userData ? (
        <Profile userData={userData} />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
*/
export default function Home() {
  const [userEmail, setUserEmail] = useState(null);
  const [userData, setUserData] = useState(null);

  // Get current user's email
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  // Fetch profile once email is available
  useEffect(() => {
    if (!userEmail) return;

    const fetchProfile = async () => {
      const res = await fetch(`/api/profile?email=${userEmail}`);
      const data = await res.json();
      setUserData(data);
    };

    fetchProfile();
  }, [userEmail]);

  return (
    <>
      {userData ? (
        <Profile userData={userData} />
      ) : (
        <p>Loading profile...</p>
      )}
    </>
  );
}
