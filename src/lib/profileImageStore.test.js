import {
  clearProfileImages,
  deleteProfileImage,
  loadProfileImage,
  saveProfileImage,
} from './profileImageStore';

function createFakeIndexedDb() {
  const stores = new Map();
  let initialized = false;

  const createDatabase = () => ({
    objectStoreNames: {
      contains: (name) => stores.has(name),
    },
    createObjectStore: (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
    },
    transaction: (name) => {
      if (!stores.has(name)) throw new Error(`Missing object store: ${name}`);

      const transaction = {};
      const records = stores.get(name);
      const schedule = (operation) => {
        const request = {};
        setTimeout(() => {
          try {
            request.result = operation();
            request.onsuccess?.();
            transaction.oncomplete?.();
          } catch (error) {
            request.error = error;
            transaction.error = error;
            request.onerror?.();
            transaction.onerror?.();
          }
        }, 0);
        return request;
      };

      transaction.objectStore = () => ({
        put: (value, key) => schedule(() => {
          records.set(key, value);
          return key;
        }),
        get: (key) => schedule(() => records.get(key)),
        delete: (key) => schedule(() => records.delete(key)),
        clear: () => schedule(() => records.clear()),
      });

      return transaction;
    },
    close: jest.fn(),
  });

  return {
    open: jest.fn(() => {
      const request = {};
      setTimeout(() => {
        request.result = createDatabase();
        if (!initialized) {
          initialized = true;
          request.onupgradeneeded?.();
        }
        request.onsuccess?.();
      }, 0);
      return request;
    }),
  };
}

let originalIndexedDb;

beforeAll(() => {
  originalIndexedDb = window.indexedDB;
});

beforeEach(() => {
  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    value: createFakeIndexedDb(),
  });
});

afterAll(() => {
  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    value: originalIndexedDb,
  });
});

test('saves, loads, and replaces a profile image Blob', async () => {
  const firstImage = new Blob(['first'], { type: 'image/jpeg' });
  const replacement = new Blob(['replacement'], { type: 'image/png' });

  await saveProfileImage('alex', firstImage);
  expect(await loadProfileImage('alex')).toBe(firstImage);

  await saveProfileImage('alex', replacement);
  expect(await loadProfileImage('alex')).toBe(replacement);
});

test('deletes one profile image and clears all profile images', async () => {
  await saveProfileImage('one', new Blob(['one']));
  await saveProfileImage('two', new Blob(['two']));

  await deleteProfileImage('one');
  expect(await loadProfileImage('one')).toBeNull();
  expect(await loadProfileImage('two')).not.toBeNull();

  await clearProfileImages();
  expect(await loadProfileImage('two')).toBeNull();
});

test('rejects invalid profile ids and non-Blob image values', async () => {
  await expect(saveProfileImage('', new Blob(['image']))).rejects.toThrow(
    'A profile id is required'
  );
  await expect(saveProfileImage('alex', 'data:image/jpeg;base64,test')).rejects.toThrow(
    'must be a Blob or File'
  );
});

test('fails clearly when IndexedDB is unavailable', async () => {
  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    value: undefined,
  });

  await expect(loadProfileImage('alex')).rejects.toThrow(
    'IndexedDB is not supported or is blocked'
  );
});
