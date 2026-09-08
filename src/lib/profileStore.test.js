import {
  PROFILE_STORAGE_KEY,
  clearStoredProfiles,
  loadStoredProfiles,
  removeStoredProfile,
  saveStoredProfiles,
  upsertProfile,
} from './profileStore';

const descriptor = (value = 0.1) => Array.from({ length: 128 }, () => value);

beforeEach(() => {
  window.localStorage.clear();
});

test('saves and restores valid profiles', () => {
  const original = {
    id: 'alex',
    name: 'Alex',
    age: '29',
    gender: 'other',
    descriptors: [descriptor()],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  saveStoredProfiles([original]);

  expect(loadStoredProfiles()).toEqual([original]);
});

test('ignores malformed stored biometric data', () => {
  window.localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify([{ id: 'bad', name: 'Bad data', descriptors: [[1, 2, 3]] }])
  );

  expect(loadStoredProfiles()).toEqual([]);
});

test('adds references to an existing case-insensitive profile and caps them', () => {
  const initial = upsertProfile(
    [],
    { name: 'Alex', age: '28', gender: 'male' },
    [descriptor(0.1)]
  ).profiles;
  const references = Array.from({ length: 12 }, (_, index) => descriptor(index / 100));
  const result = upsertProfile(
    initial,
    { name: 'alex', age: '29', gender: 'other' },
    references
  );

  expect(result.updated).toBe(true);
  expect(result.profiles).toHaveLength(1);
  expect(result.profile.descriptors).toHaveLength(10);
  expect(result.profile).toEqual(expect.objectContaining({ age: '29', gender: 'other' }));
});

test('removes one profile and clears persisted profiles', () => {
  const profiles = [
    { id: 'one', name: 'One', descriptors: [descriptor()] },
    { id: 'two', name: 'Two', descriptors: [descriptor()] },
  ];
  saveStoredProfiles(profiles);

  expect(removeStoredProfile(profiles, 'one')).toEqual([profiles[1]]);

  clearStoredProfiles();
  expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull();
});
