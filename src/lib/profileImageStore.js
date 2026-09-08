const DATABASE_NAME = 'identifeye.media.v1';
const DATABASE_VERSION = 1;
const STORE_NAME = 'profile-images';

class ProfileImageStorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ProfileImageStorageError';
    if (cause) this.cause = cause;
  }
}

const storageError = (action, cause) => {
  const detail = cause?.message ? ` ${cause.message}` : '';
  return new ProfileImageStorageError(
    `Unable to ${action} the profile image.${detail}`,
    cause
  );
};

const normalizeProfileId = (profileId) => {
  if (profileId === undefined || profileId === null) {
    throw new TypeError('A profile id is required for profile image storage.');
  }

  const id = String(profileId).trim();
  if (!id) throw new TypeError('A profile id is required for profile image storage.');
  return id;
};

const getIndexedDb = () => {
  const indexedDb = typeof window === 'undefined' ? undefined : window.indexedDB;
  if (!indexedDb) {
    throw new ProfileImageStorageError(
      'Profile image storage is unavailable because IndexedDB is not supported or is blocked in this browser.'
    );
  }
  return indexedDb;
};

const openDatabase = () => {
  let indexedDb;
  try {
    indexedDb = getIndexedDb();
  } catch (error) {
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    let request;
    let settled = false;

    const rejectOnce = (message, cause) => {
      if (settled) return;
      settled = true;
      reject(new ProfileImageStorageError(message, cause));
    };

    try {
      request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION);
    } catch (error) {
      rejectOnce('Unable to open profile image storage.', error);
      return;
    }

    request.onupgradeneeded = () => {
      try {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      } catch (error) {
        try {
          request.transaction?.abort();
        } catch {
          // The upgrade may already have been aborted by the browser.
        }
        rejectOnce('Unable to initialize profile image storage.', error);
      }
    };

    request.onerror = () => {
      rejectOnce('Unable to open profile image storage.', request.error);
    };

    request.onblocked = () => {
      rejectOnce(
        'Unable to open profile image storage because another tab is blocking the database upgrade.'
      );
    };

    request.onsuccess = () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }

      settled = true;
      resolve(database);
    };
  });
};

const runRequest = async (mode, action, createRequest) => {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      let request;
      let result;
      let settled = false;

      const rejectOnce = (cause) => {
        if (settled) return;
        settled = true;
        reject(storageError(action, cause));
      };

      try {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        request = createRequest(store);

        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => rejectOnce(request.error);
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          resolve(result);
        };
        transaction.onerror = () => rejectOnce(transaction.error || request?.error);
        transaction.onabort = () => rejectOnce(transaction.error || request?.error);
      } catch (error) {
        rejectOnce(error);
      }
    });
  } finally {
    database.close();
  }
};

export async function saveProfileImage(profileId, image) {
  const id = normalizeProfileId(profileId);
  if (typeof Blob === 'undefined' || !(image instanceof Blob)) {
    throw new TypeError('The profile image must be a Blob or File.');
  }

  await runRequest('readwrite', 'save', (store) => store.put(image, id));
}

export async function loadProfileImage(profileId) {
  const id = normalizeProfileId(profileId);
  const image = await runRequest('readonly', 'load', (store) => store.get(id));
  return image === undefined ? null : image;
}

export async function deleteProfileImage(profileId) {
  const id = normalizeProfileId(profileId);
  await runRequest('readwrite', 'delete', (store) => store.delete(id));
}

export async function clearProfileImages() {
  await runRequest('readwrite', 'clear', (store) => store.clear());
}
