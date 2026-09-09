export const PROFILE_STORAGE_KEY = 'identifeye.profiles.v1';
const MAX_DESCRIPTORS_PER_PROFILE = 10;

const getStorage = (storage) => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
};

const isDescriptor = (value) =>
  Array.isArray(value) &&
  value.length === 128 &&
  value.every((entry) => Number.isFinite(entry));

const normalizeProfile = (profile) => {
  if (!profile || typeof profile.name !== 'string' || !Array.isArray(profile.descriptors)) {
    return null;
  }

  const name = profile.name.trim();
  const descriptors = profile.descriptors.filter(isDescriptor);
  if (!name || !descriptors.length) return null;

  const normalized = {
    id: String(profile.id || profile.name),
    name,
    descriptors: descriptors.slice(0, MAX_DESCRIPTORS_PER_PROFILE),
    createdAt: profile.createdAt || new Date().toISOString(),
    updatedAt: profile.updatedAt || profile.createdAt || new Date().toISOString(),
  };

  if (profile.age !== undefined && profile.age !== null) {
    normalized.age = String(profile.age);
  }
  if (typeof profile.gender === 'string') {
    normalized.gender = profile.gender;
  }

  return normalized;
};

export function loadStoredProfiles(storage) {
  const target = getStorage(storage);
  if (!target) return [];

  try {
    const saved = JSON.parse(target.getItem(PROFILE_STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.map(normalizeProfile).filter(Boolean);
  } catch (error) {
    console.warn('Ignoring invalid IDENTIFEYE profile data:', error);
    return [];
  }
}

export function saveStoredProfiles(profiles, storage) {
  const target = getStorage(storage);
  if (!target) throw new Error('Browser storage is unavailable.');
  target.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
}

export function clearStoredProfiles(storage) {
  const target = getStorage(storage);
  target?.removeItem(PROFILE_STORAGE_KEY);
}

export function upsertProfile(profiles, profileDetails, descriptors) {
  const details = typeof profileDetails === 'string'
    ? { name: profileDetails }
    : profileDetails;
  const cleanName = details.name.trim();
  const now = new Date().toISOString();
  const existingIndex = profiles.findIndex(
    (profile) => profile.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase()
  );

  if (existingIndex >= 0) {
    const existing = profiles[existingIndex];
    const updated = {
      ...existing,
      name: cleanName,
      age: details.age === undefined ? existing.age : String(details.age),
      gender: details.gender === undefined ? existing.gender : details.gender,
      descriptors: [...existing.descriptors, ...descriptors].slice(-MAX_DESCRIPTORS_PER_PROFILE),
      updatedAt: now,
    };
    const nextProfiles = profiles.map((profile, index) =>
      index === existingIndex ? updated : profile
    );
    return { profiles: nextProfiles, profile: updated, updated: true };
  }

  const randomId =
    typeof window !== 'undefined' && window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const profile = {
    id: randomId,
    name: cleanName,
    age: details.age === undefined ? '' : String(details.age),
    gender: details.gender || '',
    descriptors: descriptors.slice(0, MAX_DESCRIPTORS_PER_PROFILE),
    createdAt: now,
    updatedAt: now,
  };

  return { profiles: [...profiles, profile], profile, updated: false };
}

export function removeStoredProfile(profiles, profileId) {
  return profiles.filter((profile) => profile.id !== profileId);
}

export function updateStoredProfile(profiles, profileId, profileDetails) {
  const profileIndex = profiles.findIndex((profile) => profile.id === profileId);
  if (profileIndex < 0) {
    throw new Error('Profile not found.');
  }

  const cleanName =
    typeof profileDetails?.name === 'string' ? profileDetails.name.trim() : '';
  if (!cleanName) {
    throw new Error('Profile name is required.');
  }

  const normalizedName = cleanName.toLocaleLowerCase();
  const duplicateName = profiles.some(
    (profile, index) =>
      index !== profileIndex &&
      typeof profile.name === 'string' &&
      profile.name.trim().toLocaleLowerCase() === normalizedName
  );
  if (duplicateName) {
    throw new Error('A profile with this name already exists.');
  }

  return profiles.map((profile, index) => {
    if (index !== profileIndex) return profile;

    return {
      ...profile,
      name: cleanName,
      age:
        profileDetails.age === undefined ? profile.age : String(profileDetails.age),
      gender:
        profileDetails.gender === undefined ? profile.gender : profileDetails.gender,
      updatedAt: new Date().toISOString(),
    };
  });
}
