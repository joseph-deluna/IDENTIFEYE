import {
  PROFILE_STORAGE_KEY,
  clearStoredProfiles,
  loadStoredProfiles,
  removeStoredProfile,
  saveStoredProfiles,
  updateStoredProfile,
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

test('updates profile metadata by id while preserving biometric data and timestamps', () => {
  const descriptors = [descriptor(0.25)];
  const original = {
    id: 'stable-id',
    name: 'Old name',
    age: '28',
    gender: 'male',
    descriptors,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };

  jest.useFakeTimers().setSystemTime(new Date('2026-02-03T04:05:06.000Z'));
  const result = updateStoredProfile(
    [original],
    'stable-id',
    { name: '  New name  ', age: 29, gender: 'other' }
  );
  jest.useRealTimers();

  expect(result).toEqual([
    {
      ...original,
      name: 'New name',
      age: '29',
      gender: 'other',
      updatedAt: '2026-02-03T04:05:06.000Z',
    },
  ]);
  expect(result[0].id).toBe(original.id);
  expect(result[0].createdAt).toBe(original.createdAt);
  expect(result[0].descriptors).toBe(descriptors);
  expect(original.name).toBe('Old name');
});

test('allows a profile to retain its own name regardless of case and whitespace', () => {
  const original = {
    id: 'one',
    name: 'Alex',
    age: '28',
    gender: 'male',
    descriptors: [descriptor()],
  };

  expect(
    updateStoredProfile([original], 'one', {
      name: '  ALEX  ',
      age: '28',
      gender: 'male',
    })[0].name
  ).toBe('ALEX');
});

test('rejects blank and case-insensitive duplicate profile names', () => {
  const profiles = [
    { id: 'one', name: 'Alex', descriptors: [descriptor()] },
    { id: 'two', name: 'Blair', descriptors: [descriptor()] },
  ];

  expect(() =>
    updateStoredProfile(profiles, 'one', { name: '   ', age: '', gender: '' })
  ).toThrow('Profile name is required.');
  expect(() =>
    updateStoredProfile(profiles, 'one', { name: ' BLAIR ', age: '', gender: '' })
  ).toThrow('A profile with this name already exists.');
  expect(profiles[0].name).toBe('Alex');
});

test('rejects an update when the stable profile id does not exist', () => {
  expect(() =>
    updateStoredProfile(
      [{ id: 'one', name: 'Alex', descriptors: [descriptor()] }],
      'missing',
      { name: 'Alex', age: '', gender: '' }
    )
  ).toThrow('Profile not found.');
});
