import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ManageClasses from '../ManageClasses';

// Mock the fetch API
globalThis.fetch = vi.fn();

describe('ManageClasses Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('sisuLinkUser', JSON.stringify({ email: 'admin@school.com' }));
    
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => []
    });
  });

  it('renders the Manage Classes header', async () => {
    render(<ManageClasses />);
    expect(screen.getByText('Manage Classes')).toBeInTheDocument();
  });

  it('opens the Create Class modal when clicking the button', async () => {
    render(<ManageClasses />);
    const createBtn = screen.getByText('Create Class');
    fireEvent.click(createBtn);
    expect(screen.getByText('Add New Class')).toBeInTheDocument();
  });

  it('filters classes based on search input', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: '1', grade: 'Grade 10', section: 'A', room_number: '101' },
        { id: '2', grade: 'Grade 11', section: 'B', room_number: '102' }
      ]
    });

    render(<ManageClasses />);
    
    await waitFor(() => expect(screen.getByText('Grade 10 - A')).toBeInTheDocument());
    
    const searchInput = screen.getByPlaceholderText('Search by class name...');
    fireEvent.change(searchInput, { target: { value: 'Grade 11' } });
    
    expect(screen.queryByText('Grade 10 - A')).not.toBeInTheDocument();
    expect(screen.getByText('Grade 11 - B')).toBeInTheDocument();
  });
});
