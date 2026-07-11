// src/components/TestConnection.tsx
import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const TestConnection = () => {
    const [status, setStatus] = useState<string>("Idle"); // Typed state

    const sendTestData = async () => {
        setStatus("Sending...");
        try {
            await addDoc(collection(db, "test_connectivity"), {
                message: "Hello AIRS (TS)",
                timestamp: new Date()
            });
            setStatus("Success! Data sent.");
        } catch (e: any) {
            console.error(e);
            setStatus("Error: " + e.message);
        }
    };

    return (
        <div>
            <h3>AIRS Connection Test</h3>
            <p>{status}</p>
            <button onClick={sendTestData}>Test Firebase Connection</button>
        </div>
    );
};

export default TestConnection;