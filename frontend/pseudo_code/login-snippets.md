1. Unified Login & Registration Component (State Toggling)

    My Code:
    ```TypeScript

    const [isLogin, setIsLogin] = useState<boolean>(true);

    // Conditional Validation based on state
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    // Toggling the UI state and clearing errors
    <button 
      onClick={() => {
        setIsLogin(!isLogin);
        setError(''); // Clear errors when switching
      }}
    >
      {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
    </button>
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/65251666/react-toggle-between-login-and-signup-components

        Thread: https://stackoverflow.com/questions/52178330/reactjs-conditional-rendering-with-early-return

    The Snippet I learned from:
    ```JavaScript

    // Using a simple boolean state to conditionally render form fields
    // instead of creating two entirely separate components/pages.
    const [isLoginMode, setIsLoginMode] = useState(true);

    return (
      <form>
        {!isLoginMode && <input type="text" placeholder="Name" />}
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="button" onClick={() => setIsLoginMode(!isLoginMode)}>
          Switch to {isLoginMode ? 'Sign Up' : 'Login'}
        </button>
      </form>
    );
    ```

2. Handling Firebase v9 Modular Authentication

    My Code:
    ```TypeScript

    import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // ... (Proceeds to save to database)
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
    }
    ```

    Source / Stack Overflow:

        Firebase Docs: https://firebase.google.com/docs/auth/web/password-auth

        Thread: https://stackoverflow.com/questions/68946446/how-do-i-use-firebase-v9-modular-sdk-for-authentication

    The Snippet I learned from:
    ```JavaScript

    // Firebase Web SDK v9 uses a functional approach rather than the old object-oriented approach
    import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

    const auth = getAuth();
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
      });
      ```

3. Syncing Firebase Auth with Firestore Database

    My Code:
    ```TypeScript

    import { doc, setDoc } from 'firebase/firestore';

    // After creating the auth profile, immediately create a matching Firestore document
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Using the Auth UID as the Firestore Document ID to link them perfectly
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      createdAt: new Date(),
      role: "standard_user" // Default role assignment
    });
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/46338556/how-to-save-user-data-in-firebase-firestore-using-react

        Thread: https://stackoverflow.com/questions/52656910/firebase-authentication-and-firestore-user-data

    The Snippet I learned from:
    ```JavaScript

    // It is best practice to use the uid provided by Firebase Auth as the document ID
    // in users collection to not have to query by email later.
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, 'users', user.uid), {
      username: 'new_user',
      email: user.email,
      timestamp: serverTimestamp()
    });
    ```

4. Sanitizing Firebase Error Messages for the UI

    My Code:
    ```TypeScript

    catch (err: any) {
      console.error("Authentication error:", err);
      const errorMessage = err.message || "An unexpected error occurred";

      // Strips the ugly "Firebase: " prefix from the raw error string 
      // so it looks cleaner for the end-user.
      setError(errorMessage.replace('Firebase: ', ''));
    } finally {
      setLoading(false); // Always reset the loading state
    }
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/60161427/how-to-handle-firebase-auth-errors-in-react

        Thread: https://stackoverflow.com/questions/43144502/how-to-get-custom-error-messages-from-firebase-authentication

    The Snippet I learned from:
    ```JavaScript

    // Firebase error strings are often formatted like "Firebase: Error (auth/invalid-email)."
    // It is common to use a switch statement on error.code, or string manipulation for a quick fix.
    catch (error) {
       let userFriendlyMessage = error.message;
       if (error.code === 'auth/wrong-password') {
           userFriendlyMessage = 'The password provided is incorrect.';
       }
       // Quick string replacement for generic errors
       setError(userFriendlyMessage.replace('Firebase:', '').trim());
    }
    ```