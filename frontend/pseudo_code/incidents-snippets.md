1. Optimistic UI Updates for Seamless UX (Assignment & Task Toggling)

    My Code:
    ``` TypeScript

    const handleToggleStep = async (docId: string, stepIndex: number) => {
      if (!selectedIncident) return;
      // 1. Calculate the new state locally
      const currentSteps = selectedIncident.completed_steps || [];
      const newSteps = currentSteps.includes(stepIndex) 
        ? currentSteps.filter(i => i !== stepIndex) 
        : [...currentSteps, stepIndex];

      // 2. Optimistic Update (Update UI immediately before the API call finishes)
      const updatedIncident = { ...selectedIncident, completed_steps: newSteps };
      setSelectedIncident(updatedIncident);
      setIncidents(prev => prev.map(inc => inc.id === docId ? updatedIncident : inc));

      // 3. Send to API
      try {
        await fetch(`http://localhost:8000/api/incidents/${docId}/mitigate`, { /*...*/ });
      } catch (err) {
        console.error("Failed to save progress", err);
      }
    };
    ```
    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/55850125/react-optimistic-ui-updates-without-external-libraries

        Thread: https://stackoverflow.com/questions/71060018/how-to-do-optimistic-updates-in-react-with-fetch

    The Snippet I learned from:
    ``` JavaScript

    // Standard approach to optimistic updates using React state
    const updateItem = async (id, newValue) => {
      // Save old state in case of failure
      const previousItems = [...items];

      // Update UI instantly
      setItems(items.map(item => item.id === id ? { ...item, val: newValue } : item));

      try {
        await fetch('/api/update', { method: 'POST', body: JSON.stringify({ newValue }) });
      } catch (error) {
        // Rollback if the API fails
        setItems(previousItems);
      }
    };
    ```

2. Deep Linking via URL Hash Event Listeners

    My Code:
    ``` TypeScript

    useEffect(() => {
      const handleDeepLink = () => {
        const hashId = window.location.hash.replace('#', '');
        if (hashId && incidents.length > 0) {
          const foundIncident = incidents.find(inc => inc.id === hashId);
          if (foundIncident) {
            setSelectedIncident(foundIncident); // Auto-open the incident
            window.history.replaceState(null, '', window.location.pathname); // Clean URL
          }
        }
      };

      handleDeepLink(); // Run on load
      window.addEventListener('hashchange', handleDeepLink); // Listen for future changes
      return () => window.removeEventListener('hashchange', handleDeepLink);
    }, [incidents]);
    ```
    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/59114389/how-to-listen-for-hash-change-in-react-useeffect

        Thread: https://stackoverflow.com/questions/25695663/react-js-detect-hash-change

    The Snippet I learned from:
    ``` JavaScript

    // Using vanilla JS event listeners inside a React hook to track URL changes
    useEffect(() => {
      const onHashChange = () => {
        console.log("Hash changed to:", window.location.hash);
        setHash(window.location.hash);
      };

      window.addEventListener('hashchange', onHashChange);
      return () => window.removeEventListener('hashchange', onHashChange); // Cleanup
    }, []);
    ```

    3. Complex Multi-Criteria Filtering with useMemo

    My Code:
    ``` TypeScript

    const filteredIncidents = useMemo(() => {
      return incidents.filter((incident) => {
        // ... (data extraction)

        // Search query filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          if (!matchesId && !matchesSummary && !matchesEvent && !matchesNotes) return false;
        }

        // Severity Array filter
        if (severityFilter.length > 0 && !severityFilter.includes(severity)) return false;

        // Date range filter
        if (dateRange.start || dateRange.end) {
          /* Date calculation logic */
          if (dateRange.start && incidentDate < startDate) return false;
          if (dateRange.end && incidentDate > endDate) return false;
        }

        return true; // Keep item if it passes all checks
      });
    }, [incidents, searchQuery, severityFilter, statusFilter, dateRange]);
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/52243405/how-to-filter-array-with-multiple-conditions-in-react

        Thread: https://stackoverflow.com/questions/65048123/react-usememo-for-filtering-an-array-of-objects

    The Snippet I learned from:
    ``` JavaScript

    // Stacking multiple conditions inside a single filter to optimize performance
    const filteredData = useMemo(() => {
      return rawData.filter(item => {
        const textMatch = item.name.includes(searchText);
        const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(item.category);
        const priceMatch = item.price >= minPrice && item.price <= maxPrice;

        return textMatch && categoryMatch && priceMatch;
      });
    }, [rawData, searchText, selectedCategories, minPrice, maxPrice]);
    ```
    4. Dynamic PDF Generation with Manual Pagination

    My Code:
    ``` TypeScript

    const doc = new jsPDF();
    let yPos = margin;

    // Helper function to calculate if text will overflow the page
    const checkPageBreak = (heightNeeded: number) => {
      if (yPos + heightNeeded > pageHeight - margin) {
        doc.addPage();
        yPos = margin; // Reset Y position for the new page
        return true;
      }
      return false;
    };

    // Example implementation wrapping text logic
    criticalIncidents.forEach((incident) => {
      checkPageBreak(60); // Ensure entire block fits
      doc.text(`Incident #${incident.event.event_id}`, margin + 3, yPos);
      yPos += 10;
      // ...
    });

    ```
    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/33423730/jspdf-add-page-if-content-height-is-larger-than-page-height

        Thread: https://github.com/simonbengtsson/jsPDF-AutoTable/issues/327

    The Snippet I learned from:
    ``` JavaScript

    // jsPDF doesn't auto-wrap custom text, so you must track the Y coordinate manually
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;

    lines.forEach(line => {
      if (y > pageHeight - 20) { 
        doc.addPage();
        y = 20; // reset to top margin
      }
      doc.text(line, 20, y);
      y += 10; // move down for next line
    });
    ```

    5. Safe Date Parsing for Firebase Timestamps

    My Code:
    ```TypeScript

    const formatTimestamp = (timestamp: any) => {
      if (!timestamp) return "N/A";
      try {
        // Firebase Firestore returns a special object { seconds, nanoseconds }
        // Standard dates return a string. This handles both safely.
        const date = timestamp?.seconds 
          ? new Date(timestamp.seconds * 1000)
          : new Date(timestamp);
        return date.toLocaleString();
      } catch {
        return "Invalid Date";
      }
    };
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/52548329/how-to-convert-firebase-firestore-timestamp-to-javascript-date

        Thread: https://stackoverflow.com/questions/46487265/convert-firebase-timestamp-to-javascript-date

    The Snippet I learned from:
    ```JavaScript

    // To convert a Firestore Timestamp to a Date, you must multiply the seconds by 1000
    const firestoreTimestamp = doc.data().createdAt;
    const jsDate = new Date(firestoreTimestamp.seconds * 1000);
    console.log(jsDate.toLocaleDateString());
    ```

6. Sorting an Array of Objects by Date Descending

    My Code:
    ```TypeScript

    .then((data: Incident[]) => {
      const sorted = data.sort((a, b) => {
        // Normalizes the time value depending on if it's a Firebase object or standard string
        const timeA = a.timestamp?.seconds || new Date(a.timestamp).getTime() || 0;
        const timeB = b.timestamp?.seconds || new Date(b.timestamp).getTime() || 0;
        return timeB - timeA; // Sorts newest to oldest
      });
      setIncidents(sorted);
      setLoading(false);
    })
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/10123953/how-to-sort-an-object-array-by-date-property

        Thread: https://stackoverflow.com/questions/8837454/sort-array-of-objects-by-single-key-with-date-value

    The Snippet I learned from:
    ```JavaScript

    // Using the built-in Array.prototype.sort() method with getTime()
    const array = [{ date: "2023-01-01" }, { date: "2023-02-01" }];
    array.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    ```

7. Dynamic Tailwind CSS Styling via Helper Functions

    My Code:
    ```TypeScript

    const getSeverityStyles = (score: number) => {
      if (score >= 8) return "bg-red-100 border-red-300 text-red-700";
      if (score >= 6) return "bg-orange-100 border-orange-300 text-orange-700";
      if (score >= 4) return "bg-yellow-100 border-yellow-300 text-yellow-700";
      if (score > 0) return "bg-green-100 border-green-300 text-green-700";
      return "bg-gray-100 border-gray-300 text-gray-700";
    };

    // Implemented inside the JSX using template literals:
    // <span className={`px-4 py-2 rounded-xl text-xs ${getSeverityStyles(riskScore)}`}>
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/41549405/react-dynamic-class-names

        Thread: https://stackoverflow.com/questions/66388439/how-to-conditionally-apply-tailwind-classes-in-react

    The Snippet I learned from:
    ```JavaScript

    // Extracting heavy conditional logic out of the JSX into a helper function
    const getButtonColor = (status) => {
      if (status === 'error') return 'bg-red-500 text-white';
      if (status === 'success') return 'bg-green-500 text-white';
      return 'bg-gray-500 text-white';
    };

    return <button className={`btn ${getButtonColor(props.status)}`}>Click</button>;
    ```

8. Guard Clauses / Early Returns for UI State Management

    My Code:
    ```TypeScript

    // 1. Check if the API is still fetching data
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full..."></div>
        </div>
      );
    }

    // 2. Check if a specific incident was clicked to show the details page
    if (selectedIncident) {
      return (
        <div className="min-h-screen p-8">
           {/* Detailed View UI */}
        </div>
      );
    }

    // 3. Fallback to the main table view
    return (
      <div className="min-h-screen p-8">
         {/* Main Dashboard UI */}
      </div>
    );
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/40450508/react-return-early-from-render

        Thread: https://stackoverflow.com/questions/52178330/reactjs-conditional-rendering-with-early-return

    The Snippet I learned from:
    ```JavaScript

    // Utilizing early returns to avoid deeply nested ternary operators in the return block
    const UserProfile = ({ user, isLoading, error }) => {
      if (isLoading) return <LoadingSpinner />;
      if (error) return <ErrorMessage text={error} />;
      if (!user) return <LoginPrompt />;

      return <div>Welcome, {user.name}!</div>;
    };
    ```