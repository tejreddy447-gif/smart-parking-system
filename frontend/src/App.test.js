import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Smart City & Legal AI Dashboard', () => {
  render(<App />);
  const headingElement = screen.getByText(/Smart City & Legal AI Dashboard/i);
  expect(headingElement).toBeInTheDocument();
});
