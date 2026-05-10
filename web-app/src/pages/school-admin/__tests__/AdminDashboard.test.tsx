import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SchoolAdminDashboard from '../SchoolAdminDashboard';

// Mock the fetch API
globalThis.fetch = vi.fn();

describe('SchoolAdminDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('sisuLinkUser', JSON.stringify({ 
      email: 'admin@school.com', 
      admin_name: 'Principal John',
      school_name: 'SisuLink Academy'
    }));
    
    // Mock the multiple fetch calls in dashboard
    (globalThis.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/dashboard')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            overallStats: { students: 1200, teachers: 50, parents: 1100, industry: 15, classes: 40 },
            dailyStats: {
              studentAttendance: { present: 1150, total: 1200, percentage: 95.8 },
              teacherAttendance: { present: 48, total: 50, percentage: 96 },
              staffLeave: { approved: 2, pending: 1 },
              eventsToday: { count: 1, nextEvent: "Staff Meeting" },
              pendingInternships: 3
            },
            notices: [],
            events: []
          })
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });
  });

  it('renders the welcome message with correct admin name', async () => {
    render(<SchoolAdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Principal John/)).toBeInTheDocument();
    });
  });

  it('displays the correct overall statistics', async () => {
    render(<SchoolAdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('1,200')).toBeInTheDocument(); // Total Students
      expect(screen.getByText('1,100')).toBeInTheDocument(); // Registered Parents
    });
  });

  it('renders charts without crashing thanks to mocks', async () => {
    render(<SchoolAdminDashboard />);
    // If Recharts wasn't mocked properly, JSDOM would throw errors here
    await waitFor(() => {
      expect(screen.getByText('Academic Trend Analysis')).toBeInTheDocument();
      expect(screen.getByText('Attendance Health')).toBeInTheDocument();
    });
  });
});
