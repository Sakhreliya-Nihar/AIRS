import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Analytics from './Analytics';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Mock Recharts to prevent SVG rendering crashes
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    AreaChart: () => <div>AreaChart</div>,
    PieChart: () => <div>PieChart</div>,
    Area: () => null, Pie: () => null, Cell: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null, Legend: () => null, CartesianGrid: () => null,
}));

// 2. Mock Data for Mathematical Verification
const mockIncidents = [
    { id: "1", analysis_status: "pending", timestamp: new Date().toISOString(), ai_insights: [{ risk_score: 9 }] },
    { id: "2", analysis_status: "pending", timestamp: new Date().toISOString(), ai_insights: [{ risk_score: 8 }] },
    { id: "3", analysis_status: "pending", timestamp: new Date().toISOString(), ai_insights: [{ risk_score: 5 }] },
    { id: "4", analysis_status: "resolved", timestamp: new Date().toISOString(), ai_insights: [{ risk_score: 2 }] }
];

// 3. Create a bulletproof global fetch mock
const mockFetch = vi.fn();

beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
    cleanup();
});

describe('Analytics Dashboard - Full Component Test Suite', () => {

    // --- STATE 1: LOADING & MOUNTING ---
    it('[UI-01] Renders the initial loading spinner before data arrives', () => {
        mockFetch.mockImplementationOnce(() => new Promise(() => { }));
        render(<Analytics />);
        expect(screen.getByText('Connecting to Local API...')).toBeInTheDocument();
    });

    // --- STATE 2: MATHEMATICAL AGGREGATIONS (useMemo) ---
    it('[UI-02] Calculates the correct Total Events metric', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockIncidents });
        render(<Analytics />);
        await waitFor(() => expect(screen.queryByText('Connecting to Local API...')).not.toBeInTheDocument());

        expect(screen.getByText('Total Events')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('[UI-03] Calculates the correct Open Cases metric', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockIncidents });
        render(<Analytics />);
        await waitFor(() => expect(screen.queryByText('Connecting to Local API...')).not.toBeInTheDocument());

        expect(screen.getByText('Open Cases')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('[UI-04] Calculates the correct Critical Threats metric (Score >= 8)', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockIncidents });
        render(<Analytics />);
        await waitFor(() => expect(screen.queryByText('Connecting to Local API...')).not.toBeInTheDocument());

        expect(screen.getByText('Critical Threats')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('[UI-05] Calculates the correct Resolved cases metric', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockIncidents });
        render(<Analytics />);
        await waitFor(() => expect(screen.queryByText('Connecting to Local API...')).not.toBeInTheDocument());

        expect(screen.getByText('Resolved')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    // --- STATE 3: ERROR HANDLING ---
    it('[UI-06] Displays the red offline boundary if the backend connection fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error("API Offline"));
        render(<Analytics />);
        await waitFor(() => {
            expect(screen.getByText('Backend Disconnected')).toBeInTheDocument();
            expect(screen.getByText('OFFLINE')).toBeInTheDocument();
        });
    });

    // --- STATE 4: INTERACTIVITY & FILTERS ---
    it('[UI-07] Loads with the default "Last 7 Days" time filter selected', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
        render(<Analytics />);
        await waitFor(() => expect(screen.queryByText('Connecting to Local API...')).not.toBeInTheDocument());

        const selectElement = screen.getByRole('combobox') as HTMLSelectElement;
        expect(selectElement.value).toBe('week');
    });

    it('[UI-08] Opens the custom date inputs when "Custom Range" is selected', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
        render(<Analytics />);
        await waitFor(() => expect(screen.queryByText('Connecting to Local API...')).not.toBeInTheDocument());

        const selectElement = screen.getByRole('combobox');
        expect(screen.queryByDisplayValue('→')).not.toBeInTheDocument();

        fireEvent.change(selectElement, { target: { value: 'custom' } });
        expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('[UI-09] Triggers a new data fetch when the Refresh Analytics button is clicked', async () => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => mockIncidents });
        render(<Analytics />);
        await waitFor(() => expect(screen.queryByText('Connecting to Local API...')).not.toBeInTheDocument());

        expect(mockFetch).toHaveBeenCalledTimes(1);

        const refreshButton = screen.getByText('REFRESH ANALYTICS');
        fireEvent.click(refreshButton);

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});