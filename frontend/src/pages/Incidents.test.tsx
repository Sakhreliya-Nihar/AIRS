import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Incidents from './Incidents';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Mock jsPDF to prevent the terminal crashing when generating reports
vi.mock('jspdf', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            internal: { pageSize: { width: 210, height: 297 }, pages: [1] },
            setFillColor: vi.fn(), rect: vi.fn(), setTextColor: vi.fn(),
            setFontSize: vi.fn(), setFont: vi.fn(), text: vi.fn(),
            addPage: vi.fn(), splitTextToSize: vi.fn().mockReturnValue(['test']),
            setPage: vi.fn(), save: vi.fn(), lastAutoTable: { finalY: 100 }
        }))
    };
});
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

// 2. Mock Data
const mockUsers = [
    { id: "user_1", name: "Alice Security", email: "alice@test.com" }
];

const mockIncidents = [
    {
        id: "inc_1", analysis_status: "pending", timestamp: new Date().toISOString(),
        event: { event_id: "EVT-123", raw_sanitised_text: "Firewall breach detected", original_filename: "log.txt", local_timestamp: "2026-01-01" },
        ai_insights: [{ summary: "Critical breach", mitigation_steps: ["Block IP"], risk_score: 9 }],
        user_notes: ["Looking into this now."], completed_steps: []
    },
    {
        id: "inc_2", analysis_status: "resolved", timestamp: new Date().toISOString(), assigned_to: "user_1",
        event: { event_id: "EVT-999", raw_sanitised_text: "Failed login attempt", original_filename: "log.txt", local_timestamp: "2026-01-02" },
        ai_insights: [{ summary: "Low risk login fail", mitigation_steps: ["Reset password"], risk_score: 2 }],
        user_notes: [], completed_steps: [0]
    }
];

// 3. Bulletproof Fetch Mock (Handles both /api/incidents and /api/users)
const mockFetch = vi.fn();

beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);

    // By default, route the fetch requests to the correct fake data
    mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/users')) return { ok: true, json: async () => mockUsers };
        if (url.includes('/api/incidents')) return { ok: true, json: async () => mockIncidents };
        return { ok: true, json: async () => ({}) };
    });
});

afterEach(() => cleanup());

describe('Incidents Dashboard - Full Component Test Suite', () => {

    // --- STATE 1: LOADING & TABLE RENDERING ---

    it('[UI-01] Renders the initial loading spinner', () => {
        mockFetch.mockImplementationOnce(() => new Promise(() => { })); // Freeze fetch
        render(<Incidents />);
        expect(screen.getByText('Loading incidents...')).toBeInTheDocument();
    });

    it('[UI-02] Successfully loads and displays incidents in the data table', async () => {
        render(<Incidents />);
        await waitFor(() => expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument());

        // Check if the event IDs rendered in the table
        expect(screen.getByText('#EVT-123')).toBeInTheDocument();
        expect(screen.getByText('#EVT-999')).toBeInTheDocument();
    });

    // --- STATE 2: SEARCH & FILTERING ---

    it('[UI-03] Filters the table correctly when a search query is entered', async () => {
        render(<Incidents />);
        await waitFor(() => expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText(/Search incidents by ID/i);
        fireEvent.change(searchInput, { target: { value: 'EVT-999' } });

        // EVT-999 should stay, EVT-123 should disappear
        expect(screen.getByText('#EVT-999')).toBeInTheDocument();
        expect(screen.queryByText('#EVT-123')).not.toBeInTheDocument();
    });

    it('[UI-04] Displays the empty state UI when a search finds no results', async () => {
        render(<Incidents />);
        await waitFor(() => expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText(/Search incidents by ID/i);
        fireEvent.change(searchInput, { target: { value: 'GIBBERISH-SEARCH-TERM' } });

        // We successfully see the empty state! 
        expect(screen.getByText('No Incidents Found')).toBeInTheDocument();

    });

    // --- STATE 3: INCIDENT DETAILS & INVESTIGATION ---

    it('[UI-05] Opens the Investigation Details view when a table row is clicked', async () => {
        render(<Incidents />);
        await waitFor(() => expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument());

        // Click the first 'INVESTIGATE' button
        const investigateButtons = screen.getAllByText('INVESTIGATE');
        fireEvent.click(investigateButtons[0]);

        // The screen should change to the details view
        expect(screen.getByText('Incident Investigation')).toBeInTheDocument();
        expect(screen.getByText('← Back to List')).toBeInTheDocument();
        expect(screen.getByText('Raw Event Data')).toBeInTheDocument();
    });

    it('[UI-06] Successfully submits a new investigation note to the API', async () => {
        render(<Incidents />);
        await waitFor(() => expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument());

        // Open details
        fireEvent.click(screen.getAllByText('INVESTIGATE')[0]);

        // Find the note input and button
        const noteInput = screen.getByPlaceholderText('Add investigation note...');
        const addNoteBtn = screen.getByText('Add Note');

        // Type a note and submit
        fireEvent.change(noteInput, { target: { value: 'This is a test note.' } });
        fireEvent.click(addNoteBtn);

        // Verify the API was called with a POST request to the /notes endpoint
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/notes'), expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ note: 'This is a test note.' })
        }));
    });

    it('[UI-07] Successfully marks an incident as resolved via the API', async () => {
        render(<Incidents />);
        await waitFor(() => expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument());

        fireEvent.click(screen.getAllByText('INVESTIGATE')[0]);

        // Click resolve
        const resolveBtn = screen.getByText('Mark as Resolved');
        fireEvent.click(resolveBtn);

        // Verify API PATCH request
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/resolve'), expect.objectContaining({
            method: 'PATCH'
        }));
    });

    // --- STATE 4: MITIGATION PLAYBOOK ---

    it('[UI-08] Switches to the Mitigation Playbook and toggles a checkbox', async () => {
        render(<Incidents />);
        await waitFor(() => expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument());

        fireEvent.click(screen.getAllByText('INVESTIGATE')[0]);

        // Switch to Mitigation view
        const mitigationBtn = screen.getByText(/MITIGATION PLAN/i);
        fireEvent.click(mitigationBtn);

        // Find and click the specific mitigation step text
        const checkboxLabel = screen.getByText('Block IP');
        fireEvent.click(checkboxLabel);

        // Verify API PATCH request to update steps
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/mitigate'), expect.objectContaining({
            method: 'PATCH'
        }));
    });

    // --- STATE 5: EXPORTS ---

    it('[UI-09] Triggers PDF Generation without crashing the application', async () => {
        render(<Incidents />);
        await waitFor(() => expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument());

        const exportBtn = screen.getByText('Generate Report');
        fireEvent.click(exportBtn);

        // If it doesn't crash here, the mock successfully intercepted the jsPDF trigger!
        expect(screen.getByText('Security Incidents')).toBeInTheDocument();
    });
});