import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.location.hash = '#/';
});

test('renders the branded login form', () => {
  const { container } = render(<App />);

  const logo = container.querySelector('.login-brand img');
  expect(logo).toBeInTheDocument();
  expect(logo.getAttribute('src')).toMatch(/identifeye-logo/i);
  expect(screen.getByText('IDENTIFEYE')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
});

test('opens the three-panel workspace and logs out with the demo login', async () => {
  const { container } = render(<App />);

  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'admin' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'admin' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  const navigation = await screen.findByRole('navigation', { name: /main navigation/i });
  const navigationLogo = navigation.querySelector('.navbar-logo');
  expect(navigationLogo).toBeInTheDocument();
  expect(navigationLogo.getAttribute('src')).toMatch(/identifeye-logo/i);
  expect(within(navigation).getByText('IDENTIFEYE')).toBeInTheDocument();
  expect(container.querySelectorAll('.square')).toHaveLength(3);
  expect(screen.getByRole('heading', { name: 'Upload Image' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Recognize Face' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Add Profile' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Recognize Face' })).toBeDisabled();

  fireEvent.click(within(navigation).getByRole('button', { name: /log out/i }));

  expect(window.location.hash).toBe('#/');
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: /main navigation/i })).not.toBeInTheDocument();
});
