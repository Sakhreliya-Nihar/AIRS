import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Settings from './Settings';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Mock the local Firebase config
vi.mock('../firebase', () => ({
    auth: {
        currentUser: { uid: 'test-user-123', email: 'test@company.com' }
    },
    db: {}
}));

// 2. Mock Firebase Auth
import { signOut, deleteUser } from 'firebase/auth';
vi.mock('firebase/auth', () => ({
    signOut: vi.fn(),
    deleteUser: vi.fn()
}));

// 3. Mock Firebase Firestore
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn()
}));

// 4. Mock the Browser Window functions (Alerts, Confirms, and Reloads)
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
    value: { reload: mockReload },
    writable: true
});
window.alert = vi.fn();
window.confirm = vi.fn();

beforeEach(() => {
    vi.clearAllMocks();
    // By default, pretend the database has no saved settings yet
    (getDoc as any).mockResolvedValue({ exists: () => false });
});

afterEach(() => {
    cleanup();
});

describe('Settings Component Test Suite', () => {

    // --- STATE 1: MOUNTING & LOADING ---

    it('[UI-01] Renders the Settings dashboard and shows the logged-in user', async () => {
        render(<Settings />);

        expect(screen.getByText('Account Settings')).toBeInTheDocument();
        // Verify it pulled the email from our mocked auth.currentUser
        expect(screen.getByText('test@company.com')).toBeInTheDocument();
    });

    it('[UI-02] Fetches existing user preferences from the database on load', async () => {
        // Fake the database returning custom settings
        (getDoc as any).mockResolvedValueOnce({
            exists: () => true,
            data: () => ({ tech_level: 'soc_analyst', notification_level: 'none' })
        });

        render(<Settings />);

        await waitFor(() => {
            // Verify it asked the database for the document
            expect(getDoc).toHaveBeenCalled();
        });
    });

    // --- STATE 2: INTERACTIVITY & SAVING ---

    it('[UI-03] Successfully saves new preferences to the database', async () => {
        (setDoc as any).mockResolvedValueOnce(); // Fake a successful save

        render(<Settings />);

        // Click on new settings
        fireEvent.click(screen.getByText('SOC Analyst'));
        fireEvent.click(screen.getByText('Do Not Disturb'));

        // Click Save
        const saveButton = screen.getByText('Save Preferences');
        fireEvent.click(saveButton);

        await waitFor(() => {
            // Verify it sent the exact updated settings to Firestore
            expect(setDoc).toHaveBeenCalledWith(
                undefined, // Because doc() is mocked, it returns undefined
                expect.objectContaining({
                    tech_level: 'soc_analyst',
                    notification_level: 'none'
                }),
                { merge: true }
            );
            // Verify the success alert popped up
            expect(window.alert).toHaveBeenCalledWith('account preferences updated successfully!');
        });
    });

    // --- STATE 3: LOGOUT ---

    it('[UI-04] Successfully triggers the secure Sign Out process', async () => {
        (signOut as any).mockResolvedValueOnce();

        render(<Settings />);

        const logoutButton = screen.getByText('Secure Sign Out');
        fireEvent.click(logoutButton);

        await waitFor(() => {
            expect(signOut).toHaveBeenCalled();
            expect(mockReload).toHaveBeenCalled(); // Verifies the page reloads to kick them out
        });
    });

    // --- STATE 4: ACCOUNT DELETION ---

    it('[UI-05] Cancels account deletion if the user declines the warning', async () => {
        // Force the popup to return "false" (User clicked Cancel)
        (window.confirm as any).mockReturnValueOnce(false);

        render(<Settings />);

        const deleteButton = screen.getByText('Delete Account');
        fireEvent.click(deleteButton);

        // Verify it asked for confirmation
        expect(window.confirm).toHaveBeenCalled();

        // Verify it ABORTED the deletion
        expect(deleteDoc).not.toHaveBeenCalled();
        expect(deleteUser).not.toHaveBeenCalled();
    });

    it('[UI-06] Successfully deletes custom data and auth profile when confirmed', async () => {
        // Force the popup to return "true" (User clicked OK)
        (window.confirm as any).mockReturnValueOnce(true);
        (deleteDoc as any).mockResolvedValueOnce();
        (deleteUser as any).mockResolvedValueOnce();

        render(<Settings />);

        const deleteButton = screen.getByText('Delete Account');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            // 1. Verify custom user data is wiped
            expect(deleteDoc).toHaveBeenCalled();
            // 2. Verify Authentication profile is wiped
            expect(deleteUser).toHaveBeenCalled();
            // 3. Verify success alert and reload
            expect(window.alert).toHaveBeenCalledWith('your account has been successfully deleted.');
            expect(mockReload).toHaveBeenCalled();
        });
    });

});