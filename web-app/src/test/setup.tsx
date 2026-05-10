import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Recharts to avoid JSDOM rendering issues
vi.mock('recharts', async () => {
  const OriginalModule = await vi.importActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    BarChart: ({ children }) => <div>{children}</div>,
    Bar: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
  };
});
