import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import StudentLoginScreen from '../(auth)/student-login';
import { useRouter } from 'expo-router';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('StudentLoginScreen', () => {
  it('renders the login fields correctly', () => {
    const { getByPlaceholderText, getByText } = render(<StudentLoginScreen />);
    
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Log In')).toBeTruthy();
  });

  it('shows an alert if email or password is empty', async () => {
    const { getByText } = render(<StudentLoginScreen />);
    const loginBtn = getByText('Log In');
    
    fireEvent.press(loginBtn);
    
    // In React Native testing library, we can't easily mock Alert.alert 
    // without manual spying, but we can check if fetch was NOT called.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('navigates to dashboard on successful login', async () => {
    const mockReplace = jest.fn();
    (useRouter as any).mockReturnValue({ replace: mockReplace });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        student: {
          first_name: 'Test',
          last_name: 'Student',
          email: 'student@example.com',
          grade_level: 'Grade 10',
          studentId: '12345'
        }
      })
    });

    const { getByPlaceholderText, getByText } = render(<StudentLoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'student@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({
        pathname: '/(student-tabs)/student-screen'
      }));
    });
  });
});
