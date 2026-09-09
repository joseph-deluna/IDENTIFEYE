import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProfileDatabase from './ProfileDatabase';
import {
  loadStoredProfiles,
  removeStoredProfile,
  saveStoredProfiles,
  updateStoredProfile,
} from '../lib/profileStore';
import { deleteProfileImage, loadProfileImage } from '../lib/profileImageStore';

jest.mock('../lib/profileStore', () => ({
  loadStoredProfiles: jest.fn(),
  removeStoredProfile: jest.fn(),
  saveStoredProfiles: jest.fn(),
  updateStoredProfile: jest.fn(),
}));

jest.mock('../lib/profileImageStore', () => ({
  deleteProfileImage: jest.fn(),
  loadProfileImage: jest.fn(),
}));

const alex = {
  id: 'alex-id',
  name: 'Alex',
  age: '29',
  gender: 'other',
  descriptors: [[0.1], [0.2]],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const blair = {
  id: 'blair-id',
  name: 'Blair',
  age: '34',
  gender: 'female',
  descriptors: [[0.3]],
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
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
  loadStoredProfiles.mockReturnValue([alex, blair]);
  loadProfileImage.mockResolvedValue(null);
  deleteProfileImage.mockResolvedValue(undefined);
  removeStoredProfile.mockReturnValue([blair]);
});

test('renders a labelled profile list and loads a stored portrait', async () => {
  const portrait = new Blob(['alex portrait'], { type: 'image/jpeg' });
  loadProfileImage.mockImplementation((profileId) =>
    Promise.resolve(profileId === alex.id ? portrait : null)
  );
  URL.createObjectURL.mockReturnValue('blob:alex-profile-photo');

  const { rerender } = render(
    <ProfileDatabase isOpen onClose={jest.fn()} onProfilesChanged={jest.fn()} />
  );

  const dialog = screen.getByRole('dialog', { name: 'Saved Profiles' });
  expect(dialog).toHaveAccessibleDescription(
    'View and manage profiles stored in this browser.'
  );
  expect(within(dialog).getAllByRole('listitem')).toHaveLength(2);
  expect(within(dialog).getByRole('heading', { name: 'Alex' })).toBeInTheDocument();
  expect(within(dialog).getByRole('heading', { name: 'Blair' })).toBeInTheDocument();

  expect(await within(dialog).findByRole('img', { name: "Alex's profile" })).toHaveAttribute(
    'src',
    'blob:alex-profile-photo'
  );
  expect(within(dialog).getByRole('img', { name: 'No saved photo for Blair' })).toBeInTheDocument();
  expect(loadProfileImage).toHaveBeenCalledTimes(2);
  expect(loadProfileImage).toHaveBeenCalledWith(alex.id);
  expect(loadProfileImage).toHaveBeenCalledWith(blair.id);
  expect(URL.createObjectURL).toHaveBeenCalledWith(portrait);

  rerender(
    <ProfileDatabase isOpen={false} onClose={jest.fn()} onProfilesChanged={jest.fn()} />
  );
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:alex-profile-photo');
});

test('edits profile metadata, saves it, and reports the change', async () => {
  const updatedAlex = {
    ...alex,
    name: 'Alexis',
    age: '30',
    gender: 'female',
    updatedAt: '2026-09-08T00:00:00.000Z',
  };
  const updatedProfiles = [updatedAlex, blair];
  updateStoredProfile.mockReturnValue(updatedProfiles);
  const onProfilesChanged = jest.fn();

  render(
    <ProfileDatabase
      isOpen
      onClose={jest.fn()}
      onProfilesChanged={onProfilesChanged}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Edit Alex' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alexis' } });
  fireEvent.change(screen.getByLabelText('Age'), { target: { value: '30' } });
  fireEvent.change(screen.getByLabelText('Gender'), { target: { value: 'female' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  expect(updateStoredProfile).toHaveBeenCalledWith([alex, blair], alex.id, {
    name: 'Alexis',
    age: '30',
    gender: 'female',
  });
  expect(saveStoredProfiles).toHaveBeenCalledWith(updatedProfiles);
  expect(screen.getByRole('heading', { name: 'Alexis' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Profile changes saved.');
  expect(onProfilesChanged).toHaveBeenCalledTimes(1);
});

test('requires explicit delete confirmation before removing metadata and portrait', async () => {
  const onProfilesChanged = jest.fn();

  render(
    <ProfileDatabase
      isOpen
      onClose={jest.fn()}
      onProfilesChanged={onProfilesChanged}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Delete Alex' }));

  expect(screen.getByRole('group', { name: 'Confirm deleting Alex' })).toBeInTheDocument();
  expect(removeStoredProfile).not.toHaveBeenCalled();
  expect(saveStoredProfiles).not.toHaveBeenCalled();
  expect(deleteProfileImage).not.toHaveBeenCalled();
  expect(onProfilesChanged).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

  expect(removeStoredProfile).toHaveBeenCalledWith([alex, blair], alex.id);
  expect(saveStoredProfiles).toHaveBeenCalledWith([blair]);
  expect(deleteProfileImage).toHaveBeenCalledWith(alex.id);
  expect(saveStoredProfiles.mock.invocationCallOrder[0]).toBeLessThan(
    deleteProfileImage.mock.invocationCallOrder[0]
  );
  expect(await screen.findByRole('status')).toHaveTextContent('Alex was deleted.');
  expect(screen.queryByRole('heading', { name: 'Alex' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Blair' })).toBeInTheDocument();
  expect(onProfilesChanged).toHaveBeenCalledTimes(1);
});

test('restores profile metadata when the saved portrait cannot be deleted', async () => {
  const onProfilesChanged = jest.fn();
  deleteProfileImage.mockRejectedValueOnce(new Error('IndexedDB blocked.'));

  render(
    <ProfileDatabase
      isOpen
      onClose={jest.fn()}
      onProfilesChanged={onProfilesChanged}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Delete Alex' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to delete Alex. Please try again.'
  );
  expect(saveStoredProfiles).toHaveBeenNthCalledWith(1, [blair]);
  expect(saveStoredProfiles).toHaveBeenNthCalledWith(2, [alex, blair]);
  expect(screen.getByRole('heading', { name: 'Alex' })).toBeInTheDocument();
  expect(onProfilesChanged).not.toHaveBeenCalled();
});

test('locks database mutations and closing while a deletion is pending', async () => {
  let finishDelete;
  const onClose = jest.fn();
  deleteProfileImage.mockReturnValueOnce(
    new Promise((resolve) => {
      finishDelete = resolve;
    })
  );

  render(
    <ProfileDatabase
      isOpen
      onClose={onClose}
      onProfilesChanged={jest.fn()}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Delete Alex' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

  expect(screen.getByRole('button', { name: 'Close profile database' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Edit Blair' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
  expect(onClose).not.toHaveBeenCalled();

  await act(async () => {
    finishDelete();
    await Promise.resolve();
  });

  expect(await screen.findByRole('status')).toHaveTextContent('Alex was deleted.');
  expect(screen.getByRole('button', { name: 'Edit Blair' })).toBeEnabled();
});

test('renders an empty state without requesting portraits', () => {
  loadStoredProfiles.mockReturnValue([]);

  render(<ProfileDatabase isOpen onClose={jest.fn()} onProfilesChanged={jest.fn()} />);

  expect(screen.getByRole('heading', { name: 'No profiles registered yet' })).toBeInTheDocument();
  expect(screen.getByText('0 profiles')).toBeInTheDocument();
  expect(loadProfileImage).not.toHaveBeenCalled();
});

test('ignores a portrait that finishes loading after the database closes', async () => {
  let resolvePortrait;
  loadStoredProfiles.mockReturnValue([alex]);
  loadProfileImage.mockReturnValue(
    new Promise((resolve) => {
      resolvePortrait = resolve;
    })
  );

  const { rerender } = render(
    <ProfileDatabase isOpen onClose={jest.fn()} onProfilesChanged={jest.fn()} />
  );
  await waitFor(() => expect(loadProfileImage).toHaveBeenCalledWith(alex.id));

  rerender(
    <ProfileDatabase isOpen={false} onClose={jest.fn()} onProfilesChanged={jest.fn()} />
  );
  await act(async () => {
    resolvePortrait(new Blob(['late portrait'], { type: 'image/jpeg' }));
    await Promise.resolve();
  });

  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
});
