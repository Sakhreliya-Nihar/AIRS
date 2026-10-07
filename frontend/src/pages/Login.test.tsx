import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Login from './Login';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Mock the local Firebase configuration file
vi.mock('../firebase', () => ({
    auth: {},
    db: {}
}));

// 2. Mock the Firebase Authentication library
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
vi.mock('firebase/auth', () => ({
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn()
}));

// 3. Mock the Firebase Firestore library
import { doc, setDoc } from 'firebase/firestore';
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    setDoc: vi.fn()
}));

beforeEach(() => {
    vi.clearAllMocks(); // Reset all faked functions before each test
});

afterEach(() => {
    cleanup(); // Wipe the virtual screen clean
});

describe('Login Component Test Suite', () => {

    // --- STATE 1: INITIAL MOUNTING ---

    it('[UI-01] Renders the Login form by default', () => {
        render(<Login />);
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        expect(screen.getByText('Log In')).toBeInTheDocument();
        // The "Name" field should NOT exist on the login screen
        expect(screen.queryByLabelText(/Full Name/i)).not.toBeInTheDocument();
    });

    // --- STATE 2: INTERACTIVITY (TOGGLING MODES) ---

    it('[UI-02] Toggles between Login and Sign Up modes', () => {
        render(<Login />);

        // Click the toggle button
        const toggleButton = screen.getByText(/Don't have an account\? Sign up/i);
        fireEvent.click(toggleButton);

        // The screen should now show Sign Up elements
        expect(screen.getByText('Create Account')).toBeInTheDocument();
        expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument(); // Name field appears
        expect(screen.getByText('Sign Up')).toBeInTheDocument();

        // Click it again to go back
        fireEvent.click(screen.getByText(/Already have an account\? Log in/i));
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });

    // --- STATE 3: LOCAL FORM VALIDATION ---

    it('[UI-03] Displays an error if the user submits an empty form', async () => {
        render(<Login />);

        const submitButton = screen.getByText('Log In');
        fireEvent.click(submitButton);

        // The form should block the submission and show a warning
        expect(screen.getByText('please fill in all required fields.')).toBeInTheDocument();
        // Verify Firebase was NEVER called
        expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
    });

    // --- STATE 4: FIREBASE INTEGRATION (LOGIN) ---

    it('[UI-04] Successfully calls Firebase Login API with valid credentials', async () => {
        (signInWithEmailAndPassword as any).mockResolvedValueOnce({ user: { uid: '123' } });
        render(<Login />);

        // Fill out the form
        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@test.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

        // Submit
        fireEvent.click(screen.getByText('Log In'));

        // Verify Firebase Auth was called with the exact emails and passwords typed
        await waitFor(() => {
            expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@test.com', 'password123');
        });
    });

    // --- STATE 5: FIREBASE INTEGRATION (SIGNUP) ---

    it('[UI-05] Successfully calls Firebase Auth and Firestore APIs when signing up', async () => {
        // Fake a successful auth creation
        (createUserWithEmailAndPassword as any).mockResolvedValueOnce({ user: { uid: 'user_777' } });
        (setDoc as any).mockResolvedValueOnce();

        render(<Login />);

        // Toggle to Sign Up
        fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));

        // Fill out the form
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'john@test.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

        fireEvent.click(screen.getByText('Sign Up'));

        await waitFor(() => {
            // 1. Verify Auth was created
            expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'john@test.com', 'password123');
            // 2. Verify Database document was created
            expect(setDoc).toHaveBeenCalled();
        });
    });

    // --- STATE 6: ERROR HANDLING ---

    it('[UI-06] Safely catches and displays Firebase Authentication errors', async () => {
        // Force Firebase to throw an ugly error
        (signInWithEmailAndPassword as any).mockRejectedValueOnce(new Error('Firebase: auth/user-not-found'));

        render(<Login />);

        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'wrong@test.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpass' } });
        fireEvent.click(screen.getByText('Log In'));

        // The UI should strip out "Firebase: " and show the clean error to the user
        await waitFor(() => {
            expect(screen.getByText('auth/user-not-found')).toBeInTheDocument();
        });
    });

});