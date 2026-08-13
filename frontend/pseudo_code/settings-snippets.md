1. Modular Reusable Components inside JSX

    My Code:
    ```TypeScript

    // Refactored Helper component for Notification Cards (Reusable)
    const NotificationCard = ({ id, label, icon: Icon, description, colorClass, selectedValue, onSelect }: any) => (
        <div 
            onClick={() => onSelect(id)}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                selectedValue === id 
                ? `border-${colorClass}-500 bg-${colorClass}-50` 
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
        >
            <div className={`p-2 rounded-lg ${selectedValue === id ? `bg-${colorClass}-500 text-white` : "bg-slate-100 text-slate-500"}`}>
                <Icon size={20} />
            </div>
            {/* Text elements... */}
        </div>
    );
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/43132640/creating-a-reusable-component-in-react

        Thread: https://stackoverflow.com/questions/70417246/how-to-create-a-reusable-react-component-with-dynamic-classes

    The Snippet I learned from:
    ```JavaScript

    // Abstracting repetitive JSX into a local function component to clean up the main render block
    const Card = ({ title, isActive, onClick }) => (
      <div 
        className={`card ${isActive ? 'active' : ''}`} 
        onClick={onClick}
      >
        <h3>{title}</h3>
      </div>
    );
    ```

2. Destructive Action Confirmation and Security

    My Code:
    ```TypeScript

    const handleDeleteAccount = async () => {
        const user = auth.currentUser;
        if (!user) return;

        // Native browser confirm dialog acts as a safety barrier
        const confirmDelete = window.confirm(
            "Are you absolutely sure you want to delete your account? This action cannot be undone..."
        );

        if (confirmDelete) {
            try {
                await deleteDoc(doc(db, "users", user.uid)); // Delete DB profile
                await deleteUser(user); // Delete Auth profile
                alert("Your account has been successfully deleted.");
                window.location.reload();
            } catch (error: any) {
                // Catching Firebase's specific security requirement error
                if (error.code === 'auth/requires-recent-login') {
                    alert("For security reasons, please log out and log back in before deleting your account.");
                }
            }
        }
    };
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/44122971/how-to-delete-user-from-firebase-auth-and-firestore

        Firebase Docs: https://firebase.google.com/docs/auth/web/manage-users#re-authenticate_a_user

    The Snippet I learned from:
    ```JavaScript

    // Security-sensitive operations in Firebase (like deletion or password changes)
    // throw a 'requires-recent-login' error if the token is too old.
    deleteUser(user).catch((error) => {
      if (error.code === 'auth/requires-recent-login') {
        // The user must re-authenticate before this operation can execute.
        reauthenticate(); 
      }
    });
    ```

3. Merging Firestore Document Data

    My Code:
    ```TypeScript

    const handleSave = async () => {
        // ...
        try {
            // Save ALL preferences to Firestore
            await setDoc(doc(db, "users", user.uid), {
                tech_level: techLevel,
                notification_level: notificationLevel,
                app_notification_level: appNotificationLevel
            }, { merge: true }); // <--- Crucial flag

            alert("Account preferences updated successfully!");
        } catch(e) {
            console.error(e);
        }
    };
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/46597327/set-vs-update-in-firebase-firestore

        Firebase Docs: https://firebase.google.com/docs/firestore/manage-data/add-data#set_a_document

    The Snippet I learned from:
    ```JavaScript

    // setDoc normally overwrites the entire document, destroying data not included in the payload.
    // Adding { merge: true } forces it to only update the specific fields provided, 
    // leaving things like 'createdAt' or 'name' intact.
    const cityRef = doc(db, 'cities', 'BJ');
    setDoc(cityRef, { capital: true }, { merge: true });
    ```

4. Loading User Profile Data on Mount

    My Code:
    ```TypeScript

    useEffect(() => {
        const fetchSettings = async () => {
            const user = auth.currentUser;
            if (!user) return; 

            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Load saved state into the UI
                    if (data.tech_level) setTechLevel(data.tech_level);
                    if (data.notification_level) setNotificationLevel(data.notification_level);
                    if (data.app_notification_level) setAppNotificationLevel(data.app_notification_level);
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            }
        };
        fetchSettings();
    }, []);
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/46656476/how-to-retrieve-data-from-firestore-in-react

        Thread: https://stackoverflow.com/questions/65487739/firebase-getdoc-not-working-in-useeffect

    The Snippet I learned from:
    ```JavaScript

    // Using an async IIFE or interior async function inside useEffect
    // to fetch a single document from Firestore and populate the state.
    useEffect(() => {
      async function getUserData() {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
      getUserData();
    }, []);
    ```