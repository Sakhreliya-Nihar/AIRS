1. Detecting "Click Outside" to Close Dropdown Menus

    My Code:
    ```TypeScript

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        // Check if the click happened outside the referenced dropdown element
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsDropdownOpen(false);
        }
      };

      // Bind the event listener
      document.addEventListener("mousedown", handleClickOutside);
      // Clean up the listener when the component unmounts
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/32553158/detect-click-outside-react-component

        Thread: https://stackoverflow.com/questions/43236314/react-useref-hook-for-clicking-outside

    The Snippet I learned from:
    ```JavaScript

    // The standard React pattern for building custom dropdowns or modals
    // relies on useRef to grab the DOM node and checking event.target
    function useOutsideAlerter(ref) {
      useEffect(() => {
        function handleClickOutside(event) {
          if (ref.current && !ref.current.contains(event.target)) {
            alert("You clicked outside of me!");
          }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }, [ref]);
    }
    ```

2. Real-Time UI Sync with Firestore onSnapshot

    My Code:
    ```TypeScript

    const setupRealtimeUser = () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        // Listens actively for changes to the database and updates the UI instantly
        unsubUser = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.app_notification_level) setAppNotificationLevel(data.app_notification_level);
            if (data.cleared_notifications) setClearedNotifs(data.cleared_notifications);
          } 
        });
      }
    };
    ```

    Source / Stack Overflow:

        Firebase Docs: https://firebase.google.com/docs/firestore/query-data/listen

        Thread: https://stackoverflow.com/questions/68783060/how-to-use-onsnapshot-in-firebase-v9

    The Snippet I learned from:
    ```JavaScript

    // Instead of using getDoc() which fetches data once, onSnapshot() opens 
    // a websocket connection. It automatically fires the callback every time the data changes.
    import { doc, onSnapshot } from "firebase/firestore";

    const unsub = onSnapshot(doc(db, "cities", "SF"), (doc) => {
        console.log("Current data: ", doc.data());
    });
    ```

3. Background API Polling with Automatic Cleanup

    My Code:
    ```TypeScript

    useEffect(() => {
      const fetchActiveAlerts = async () => { /* Fetch logic */ };

      fetchActiveAlerts(); // Run immediately on mount

      // Poll the API every 30 seconds for new incidents
      const interval = setInterval(fetchActiveAlerts, 30000);

      // Prevent memory leaks by clearing the interval if the component unmounts
      return () => {
        clearInterval(interval);
      };
    }, []);
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/46140764/polling-api-every-x-seconds-with-react

        Thread: https://stackoverflow.com/questions/53332321/react-hook-warnings-for-async-function-in-useeffect

    The Snippet I learned from:
    ```JavaScript

    // When using setInterval in React, you MUST return a cleanup function 
    // to clear it, otherwise you'll spawn infinite overlapping loops if the component re-renders.
    useEffect(() => {
      const MINUTE_MS = 60000;
      const interval = setInterval(() => {
        console.log('Logs every minute');
      }, MINUTE_MS);

      return () => clearInterval(interval); 
    }, [])
    ```

4. Generating Relative "Time Ago" Strings

    My Code:
    ```TypeScript

    const formatTimeAgo = (timestamp: any) => {
      if (!timestamp) return "Recently";
      try {
        const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        // Calculate the difference between now and the timestamp in seconds
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        let interval = seconds / 86400; // Days
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600; // Hours
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60; // Minutes
        if (interval > 1) return Math.floor(interval) + "m ago";

        return "Just now";
      } catch {
        return "Recently";
      }
    };
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/3177836/how-to-format-time-since-xxx-e-g-4-minutes-ago-similar-to-stack-exchange-site

    The Snippet I learned from:
    ```JavaScript

    // Standard mathematical approach to creating relative timestamps without
    // needing a massive external library like Moment.js or Date-fns.
    function timeSince(date) {
      var seconds = Math.floor((new Date() - date) / 1000);
      var interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + " years";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + " months";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + " days";
      return Math.floor(seconds) + " seconds";
    }
    ```

5. Programmatic Deep Linking to Other Components

    My Code:
    ```TypeScript

    // Inside the notification dropdown item onClick:
    onClick={() => {
      // 1. Add the specific incident ID to the URL hash
      window.location.hash = inc.id; 

      // 2. Close the dropdown menu visually
      setIsDropdownOpen(false);

      // 3. Trigger the parent state to switch tabs to the Incidents view
      onSelect("Incidents"); 
    }}
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/40968179/how-to-programmatically-change-url-in-react

    The Snippet I learned from:
    ```JavaScript

    // Combining a state update (to show the right UI view) with a browser API update
    // (to pass data via the URL) so the target component knows what to display.
    const handleNavigate = (itemId) => {
        window.location.hash = `id=${itemId}`;
        setPage('details_view');
    }
    ```