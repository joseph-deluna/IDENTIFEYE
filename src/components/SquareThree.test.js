import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SquareThree from './SquareThree';
import { createReferenceDescriptors, loadFaceModels } from '../lib/faceRecognition';
import { loadStoredProfiles, saveStoredProfiles, upsertProfile } from '../lib/profileStore';
import {
  deleteProfileImage,
  loadProfileImage,
  saveProfileImage,
} from '../lib/profileImageStore';

jest.mock('../lib/faceRecognition', () => ({
  createReferenceDescriptors: jest.fn(),
  loadFaceModels: jest.fn(),
}));

jest.mock('../lib/profileStore', () => ({
  loadStoredProfiles: jest.fn(),
  saveStoredProfiles: jest.fn(),
  upsertProfile: jest.fn(),
}));

jest.mock('../lib/profileImageStore', () => ({
  deleteProfileImage: jest.fn(),
  loadProfileImage: jest.fn(),
  saveProfileImage: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  loadFaceModels.mockResolvedValue(undefined);
  createReferenceDescriptors.mockResolvedValue([[0.1]]);
  loadStoredProfiles.mockReturnValue([]);
  loadProfileImage.mockResolvedValue(null);
  deleteProfileImage.mockResolvedValue(undefined);
  saveProfileImage.mockResolvedValue(undefined);
  upsertProfile.mockReturnValue({
    updated: false,
    profile: {
      id: 'alex-id',
      name: 'Alex',
      age: '29',
      gender: 'other',
      descriptors: [[0.1]],
    },
    profiles: [
      {
        id: 'alex-id',
        name: 'Alex',
        age: '29',
        gender: 'other',
        descriptors: [[0.1]],
      },
    ],
  });
});

const completeForm = (images) => {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alex' } });
  fireEvent.change(screen.getByLabelText('Age'), { target: { value: '29' } });
  fireEvent.change(screen.getByLabelText('Gender'), { target: { value: 'other' } });
  fireEvent.change(screen.getByLabelText('Reference photos'), {
    target: { files: images },
  });
};

test('stores the first reference image and profile data, then shows inline success', async () => {
  render(<SquareThree />);
  const firstImage = new File(['portrait-one'], 'alex-front.jpg', { type: 'image/jpeg' });
  const secondImage = new File(['portrait-two'], 'alex-side.jpg', { type: 'image/jpeg' });

  completeForm([firstImage, secondImage]);
  fireEvent.click(screen.getByRole('button', { name: 'Submit Profile' }));

  expect(await screen.findByRole('status')).toHaveTextContent(
    'Profile added successfully.'
  );
  expect(createReferenceDescriptors).toHaveBeenCalledWith([firstImage, secondImage]);
  expect(upsertProfile).toHaveBeenCalledWith(
    [],
    { name: 'Alex', age: '29', gender: 'other' },
    [[0.1]]
  );
  expect(saveProfileImage).toHaveBeenCalledWith('alex-id', firstImage);
  expect(loadProfileImage).toHaveBeenCalledWith('alex-id');
  expect(saveStoredProfiles).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ id: 'alex-id' })])
  );
  expect(saveProfileImage.mock.invocationCallOrder[0]).toBeLessThan(
    saveStoredProfiles.mock.invocationCallOrder[0]
  );
});

test('shows an inline error and does not persist profile data when image storage fails', async () => {
  render(<SquareThree />);
  const image = new File(['portrait'], 'alex.jpg', { type: 'image/jpeg' });
  saveProfileImage.mockRejectedValueOnce(new Error('Image storage unavailable.'));

  completeForm([image]);
  fireEvent.click(screen.getByRole('button', { name: 'Submit Profile' }));

  expect(await screen.findByRole('status')).toHaveTextContent(
    'Failed to add profile: Image storage unavailable.'
  );
  await waitFor(() => expect(saveProfileImage).toHaveBeenCalledWith('alex-id', image));
  expect(saveStoredProfiles).not.toHaveBeenCalled();
});

test('removes a newly saved portrait when profile metadata cannot be persisted', async () => {
  render(<SquareThree />);
  const image = new File(['portrait'], 'alex.jpg', { type: 'image/jpeg' });
  saveStoredProfiles.mockImplementationOnce(() => {
    throw new Error('Local storage quota exceeded.');
  });

  completeForm([image]);
  fireEvent.click(screen.getByRole('button', { name: 'Submit Profile' }));

  expect(await screen.findByRole('status')).toHaveTextContent(
    'Failed to add profile: Local storage quota exceeded.'
  );
  expect(deleteProfileImage).toHaveBeenCalledWith('alex-id');
});
