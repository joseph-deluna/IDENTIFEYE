import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SquareThree from './SquareThree';
import { createReferenceDescriptors, loadFaceModels } from '../lib/faceRecognition';
import { loadStoredProfiles, saveStoredProfiles, upsertProfile } from '../lib/profileStore';

jest.mock('../lib/faceRecognition', () => ({
  createReferenceDescriptors: jest.fn(),
  loadFaceModels: jest.fn(),
}));

jest.mock('../lib/profileStore', () => ({
  loadStoredProfiles: jest.fn(),
  saveStoredProfiles: jest.fn(),
  upsertProfile: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, 'alert').mockImplementation(() => {});
  loadFaceModels.mockResolvedValue(undefined);
  createReferenceDescriptors.mockResolvedValue([[0.1]]);
  loadStoredProfiles.mockReturnValue([]);
  upsertProfile.mockReturnValue({
    updated: false,
    profiles: [{ name: 'Alex', age: '29', gender: 'other', descriptors: [[0.1]] }],
  });
});

afterEach(() => {
  window.alert.mockRestore();
});

test('adds a profile to browser storage from the original form', async () => {
  const { container } = render(<SquareThree />);
  const image = new File(['portrait'], 'alex.jpg', { type: 'image/jpeg' });

  fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Alex' } });
  fireEvent.change(screen.getByPlaceholderText('Age'), { target: { value: '29' } });
  fireEvent.change(container.querySelector('select[name="gender"]'), {
    target: { value: 'other' },
  });
  fireEvent.change(container.querySelector('input[type="file"]'), {
    target: { files: [image] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Submit Profile' }));

  await waitFor(() => expect(saveStoredProfiles).toHaveBeenCalled());
  expect(createReferenceDescriptors).toHaveBeenCalledWith([image]);
  expect(upsertProfile).toHaveBeenCalledWith(
    [],
    { name: 'Alex', age: '29', gender: 'other' },
    [[0.1]]
  );
  expect(window.alert).toHaveBeenCalledWith('Profile added successfully');
});
