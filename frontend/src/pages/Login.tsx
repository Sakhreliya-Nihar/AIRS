// src/login.tsx
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// main authentication component for the application
const Login: React.FC = () => {
    // state hooks for managing form data and ui status
    const [isLogin, setIsLogin] = useState<boolean>(true);
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    // handles both login and registration form submission
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        // prevent page reload on form submit
        e.preventDefault();
        setError('');
        setLoading(true);

        // validate that required fields are not empty
        if (!email || !password || (!isLogin && !name)) {
            setError('please fill in all required fields.');
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                // authenticate existing user
                await signInWithEmailAndPassword(auth, email, password);

            } else {
                // register new user in firebase auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // create a corresponding document in the users collection
                await setDoc(doc(db, "users", user.uid), {
                    name: name,
                    email: email,
                    createdAt: new Date(),
                    role: "standard_user"
                });

            }

        } catch (err: any) {
            // log error and extract readable message for the user
            console.error("authentication error:", err);
            const errorMessage = err.message || "an unexpected error occurred";
            // strip out the ugly prefix from firebase error strings
            setError(errorMessage.replace('Firebase: ', ''));
        } finally {
            // disable loading state regardless of outcome
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-gray-100 w-full max-w-md">

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-gray-800">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-gray-500 font-bold mt-2">
                        {isLogin ? 'Enter your credentials to access the dashboard' : 'Sign up to monitor security incidents'}
                    </p>
                </div>

                {/* conditional rendering for error messages */}
                {error && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-600 p-3 rounded-xl text-sm font-bold mb-6 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* only show name field if user is signing up */}
                    {!isLogin && (
                        <div>
                            <label htmlFor="name" className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl text-sm focus:border-purple-400 outline-none transition-colors"
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl text-sm focus:border-purple-400 outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl text-sm focus:border-purple-400 outline-none transition-colors"
                        />
                    </div>

                    {/* dynamic submit button text based on current mode */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 text-white py-3 rounded-xl font-black hover:bg-purple-700 transition-all shadow-md disabled:bg-purple-400 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
                    </button>
                </form>

                {/* toggle between login and sign up modes */}
                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            // clear any existing errors when switching modes
                            setError('');
                        }}
                        className="text-sm font-bold text-gray-500 hover:text-purple-600 transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                    </button>
                </div>

            </div>
        </div>
    );
};
