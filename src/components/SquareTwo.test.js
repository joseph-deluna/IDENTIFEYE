import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SquareTwo from './SquareTwo';
import { loadFaceModels, recognizeFaces } from '../lib/faceRecognition';
import { loadStoredProfiles } from '../lib/profileStore';

jest.mock('../lib/faceRecognition', () => ({
  loadFaceModels: jest.fn(),
  recognizeFaces: jest.fn(),
}));

jest.mock('../lib/profileStore', () => ({
  loadStoredProfiles: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  loadFaceModels.mockResolvedValue(undefined);
  loadStoredProfiles.mockReturnValue([
    { name: 'Alex', age: '29', gender: 'other', descriptors: [[0.1]] },
  ]);
  recognizeFaces.mockResolvedValue({
    faces: [{ label: 'Alex', isMatch: true, distance: 0.42 }],
  });
});

test('shows the original match message after recognizing an uploaded image', async () => {
  const image = new File(['query'], 'query.jpg', { type: 'image/jpeg' });
  const onRecognitionComplete = jest.fn();
  render(
    <SquareTwo uploadedImage={image} onRecognitionComplete={onRecognitionComplete} />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Recognize Face' }));

  expect(await screen.findByText('Match found: Alex')).toBeInTheDocument();
  await waitFor(() => {
    expect(onRecognitionComplete).toHaveBeenCalledWith({
      match: true,
      message: 'Match found: Alex',
    });
  });
  expect(recognizeFaces).toHaveBeenCalledWith(image, expect.any(Array));
});
