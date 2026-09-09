import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SquareTwo from './SquareTwo';
import { loadFaceModels, recognizeFaces } from '../lib/faceRecognition';
import { loadProfileImage } from '../lib/profileImageStore';
import { loadStoredProfiles } from '../lib/profileStore';
import { waitForResultReveal } from '../lib/scanDelay';

jest.mock('../lib/faceRecognition', () => ({
  loadFaceModels: jest.fn(),
  recognizeFaces: jest.fn(),
}));

jest.mock('../lib/profileImageStore', () => ({
  loadProfileImage: jest.fn(),
}));

jest.mock('../lib/profileStore', () => ({
  loadStoredProfiles: jest.fn(),
}));

jest.mock('../lib/scanDelay', () => ({
  waitForResultReveal: jest.fn(),
}));

const enrolledProfile = {
  id: 'alex-profile',
  name: 'Alex',
  age: '29',
  gender: 'other',
  descriptors: [[0.1]],
};

const matchResponse = {
  faces: [{ label: 'Alex', isMatch: true, distance: 0.42 }],
};

let originalCreateObjectURL;
let originalRevokeObjectURL;

beforeAll(() => {
  originalCreateObjectURL = URL.createObjectURL;
  originalRevokeObjectURL = URL.revokeObjectURL;

  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });
});

afterAll(() => {
  if (originalCreateObjectURL) {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreateObjectURL,
    });
  } else {
    delete URL.createObjectURL;
  }

  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });
  } else {
    delete URL.revokeObjectURL;
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  loadFaceModels.mockResolvedValue(undefined);
  loadStoredProfiles.mockReturnValue([enrolledProfile]);
  loadProfileImage.mockResolvedValue(
    new Blob(['enrolled portrait'], { type: 'image/jpeg' })
  );
  recognizeFaces.mockResolvedValue(matchResponse);
  waitForResultReveal.mockResolvedValue(undefined);
  URL.createObjectURL.mockReturnValue('blob:alex-profile-photo');
});

test('renders the enrolled photo and profile details for a successful match', async () => {
  const image = new File(['query'], 'query.jpg', { type: 'image/jpeg' });
  const onRecognitionComplete = jest.fn();

  render(
    <SquareTwo uploadedImage={image} onRecognitionComplete={onRecognitionComplete} />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Recognize Face' }));

  expect(await screen.findByRole('heading', { name: 'Alex' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: "Alex's enrolled profile" })).toHaveAttribute(
    'src',
    'blob:alex-profile-photo'
  );
  expect(screen.getByText('29')).toBeInTheDocument();
  expect(screen.getByText('Other')).toBeInTheDocument();
  expect(loadProfileImage).toHaveBeenCalledWith('alex-profile');
  expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(waitForResultReveal).toHaveBeenCalledTimes(1);
  expect(recognizeFaces).toHaveBeenCalledWith(image, [enrolledProfile]);
  expect(onRecognitionComplete).toHaveBeenCalledWith({
    match: true,
    message: 'Match found: Alex',
    profile: enrolledProfile,
  });
});

test('uses the fallback artwork when the enrolled profile has no saved photo', async () => {
  loadProfileImage.mockResolvedValue(null);

  render(<SquareTwo uploadedImage={new File(['query'], 'query.jpg')} />);
  fireEvent.click(screen.getByRole('button', { name: 'Recognize Face' }));

  expect(await screen.findByRole('heading', { name: 'Alex' })).toBeInTheDocument();
  expect(
    screen.getByRole('img', { name: 'No saved profile photo for Alex' })
  ).toHaveClass('fallback');
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('keeps the scanner visible until the three-second reveal delay completes', async () => {
  let finishDelay;
  waitForResultReveal.mockReturnValueOnce(
    new Promise((resolve) => {
      finishDelay = resolve;
    })
  );

  render(<SquareTwo uploadedImage={new File(['query'], 'query.jpg')} />);
  fireEvent.click(screen.getByRole('button', { name: 'Recognize Face' }));

  expect(screen.getByText('Looking for a match in your profiles')).toBeInTheDocument();
  await waitFor(() => expect(waitForResultReveal).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('heading', { name: 'Alex' })).not.toBeInTheDocument();

  await act(async () => {
    finishDelay();
    await Promise.resolve();
  });

  expect(await screen.findByRole('heading', { name: 'Alex' })).toBeInTheDocument();
});

test('clears an earlier match when a later scan has no match', async () => {
  const onRecognitionComplete = jest.fn();
  recognizeFaces
    .mockResolvedValueOnce(matchResponse)
    .mockResolvedValueOnce({
      faces: [{ label: 'unknown', isMatch: false, distance: 0.91 }],
    });

  render(
    <SquareTwo
      uploadedImage={new File(['query'], 'query.jpg')}
      onRecognitionComplete={onRecognitionComplete}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Recognize Face' }));
  expect(await screen.findByRole('heading', { name: 'Alex' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Scan again' }));

  expect(await screen.findByText('No match found.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Alex' })).not.toBeInTheDocument();
  expect(
    screen.queryByRole('img', { name: "Alex's enrolled profile" })
  ).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:alex-profile-photo');
  await waitFor(() => {
    expect(onRecognitionComplete).toHaveBeenLastCalledWith({
      match: false,
      message: 'No match found.',
    });
  });
});

test('clears a displayed match when the profile database changes', async () => {
  const image = new File(['query'], 'query.jpg');
  const { rerender } = render(
    <SquareTwo uploadedImage={image} profileRevision={0} />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Recognize Face' }));
  expect(await screen.findByRole('heading', { name: 'Alex' })).toBeInTheDocument();

  rerender(<SquareTwo uploadedImage={image} profileRevision={1} />);

  expect(screen.queryByRole('heading', { name: 'Alex' })).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:alex-profile-photo');
});
