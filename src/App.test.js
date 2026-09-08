import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.location.hash = '#/';
});

test('renders the original login form', () => {
  render(<App />);
  expect(screen.getByLabelText('Username:')).toBeInTheDocument();
  expect(screen.getByLabelText('Password:')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
});

test('opens the three-card face recognition screen with the demo login', async () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText('Username:'), { target: { value: 'admin' } });
  fireEvent.change(screen.getByLabelText('Password:'), { target: { value: 'admin' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));

  expect(await screen.findByText('Upload Image')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Recognize Face' })).toBeDisabled();
  expect(screen.getByRole('heading', { name: 'Add Profile' })).toBeInTheDocument();
});
