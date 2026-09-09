import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  loadStoredProfiles,
  PROFILE_STORAGE_KEY,
  removeStoredProfile,
  saveStoredProfiles,
  updateStoredProfile,
} from '../lib/profileStore';
import { deleteProfileImage, loadProfileImage } from '../lib/profileImageStore';
import fallbackProfileImage from '../img/identifeye-logo-transparent.png';

const displayGender = (gender) => {
  if (!gender) return 'Not provided';
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

function ProfileThumbnail({ profile }) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setImageUrl('');
    setImageFailed(false);

    loadProfileImage(profile.id)
      .then((image) => {
        if (cancelled || !image) return;
        objectUrl = URL.createObjectURL(image);
        setImageUrl(objectUrl);
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn(`Unable to load the profile photo for ${profile.name}:`, error);
          setImageFailed(true);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profile.id, profile.name]);

  const useFallback = !imageUrl || imageFailed;

  return (
    <img
      className={`database-profile-image${useFallback ? ' fallback' : ''}`}
      src={useFallback ? fallbackProfileImage : imageUrl}
      alt={useFallback ? `No saved photo for ${profile.name}` : `${profile.name}'s profile`}
      onError={() => setImageFailed(true)}
    />
  );
}

function ProfileDatabase({ isOpen, onClose, onProfilesChanged }) {
  const [profiles, setProfiles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [draft, setDraft] = useState({ name: '', age: '', gender: '' });
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState(null);
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const busyRef = useRef(false);
  const missedStorageEventRef = useRef(false);

  const requestClose = useCallback(() => {
    if (!busyRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    setProfiles(loadStoredProfiles());
    setEditingId(null);
    setPendingDeleteId(null);
    setStatus(null);

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
        ) || []
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleStorage = (event) => {
      if (event.key !== PROFILE_STORAGE_KEY) return;
      if (busyRef.current) {
        missedStorageEventRef.current = true;
        return;
      }

      setProfiles(loadStoredProfiles());
      setEditingId(null);
      setPendingDeleteId(null);
      setStatus({ type: 'warning', text: 'Profiles were refreshed after a change in another tab.' });
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('storage', handleStorage);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, requestClose]);

  const beginEdit = (profile) => {
    if (busyRef.current) return;
    setEditingId(profile.id);
    setPendingDeleteId(null);
    setDraft({
      name: profile.name,
      age: profile.age || '',
      gender: profile.gender || '',
    });
    setStatus(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setStatus(null);
  };

  const saveEdit = (event, profileId) => {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyId(profileId);
    setStatus(null);

    try {
      const currentProfiles = loadStoredProfiles();
      const updatedProfiles = updateStoredProfile(currentProfiles, profileId, draft);
      saveStoredProfiles(updatedProfiles);
      setProfiles(updatedProfiles);
      setEditingId(null);
      setStatus({ type: 'success', text: 'Profile changes saved.' });
      onProfilesChanged?.();
    } catch (error) {
      setStatus({ type: 'error', text: error.message || 'Unable to update the profile.' });
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  };

  const requestDelete = (profileId) => {
    if (busyRef.current) return;
    setEditingId(null);
    setPendingDeleteId(profileId);
    setStatus(null);
  };

  const confirmDelete = async (profile) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyId(profile.id);
    setStatus(null);

    const originalProfiles = loadStoredProfiles();
    const originalProfile = originalProfiles.find(({ id }) => id === profile.id);
    const originalIndex = originalProfiles.findIndex(({ id }) => id === profile.id);
    try {
      const remainingProfiles = removeStoredProfile(originalProfiles, profile.id);
      saveStoredProfiles(remainingProfiles);
      setProfiles(remainingProfiles);

      try {
        await deleteProfileImage(profile.id);
        setProfiles(remainingProfiles);
        setPendingDeleteId(null);
        setStatus({ type: 'success', text: `${profile.name} was deleted.` });
        onProfilesChanged?.();
      } catch {
        try {
          const latestProfiles = loadStoredProfiles();
          const restoredProfiles = [...latestProfiles];
          if (originalProfile && !restoredProfiles.some(({ id }) => id === profile.id)) {
            restoredProfiles.splice(
              Math.min(Math.max(originalIndex, 0), restoredProfiles.length),
              0,
              originalProfile
            );
          }
          saveStoredProfiles(restoredProfiles);
          setProfiles(restoredProfiles);
          setStatus({ type: 'error', text: `Unable to delete ${profile.name}. Please try again.` });
        } catch (rollbackError) {
          console.error('Unable to restore profile metadata after photo deletion failed:', rollbackError);
          setProfiles(remainingProfiles);
          setPendingDeleteId(null);
          setStatus({
            type: 'warning',
            text: `${profile.name} was removed, but local storage cleanup was incomplete.`,
          });
          onProfilesChanged?.();
        }
      }
    } catch (error) {
      setStatus({ type: 'error', text: error.message || 'Unable to delete the profile.' });
    } finally {
      busyRef.current = false;
      setBusyId(null);
      if (missedStorageEventRef.current) {
        missedStorageEventRef.current = false;
        setProfiles(loadStoredProfiles());
      }
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="database-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) requestClose();
    }}>
      <section
        ref={dialogRef}
        className="database-dialog"
        role="dialog"
        aria-modal="true"
        aria-busy={Boolean(busyId)}
        aria-labelledby="database-title"
        aria-describedby="database-description"
      >
        <header className="database-header">
          <div>
            <span className="panel-number">LOCAL DATABASE</span>
            <h2 id="database-title">Saved Profiles</h2>
            <p id="database-description">View and manage profiles stored in this browser.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="database-close"
            onClick={requestClose}
            disabled={Boolean(busyId)}
            aria-label="Close profile database"
          >
            ×
          </button>
        </header>

        <div className="database-toolbar">
          <strong>{profiles.length} profile{profiles.length === 1 ? '' : 's'}</strong>
          <span>Face descriptors and portraits stay on this device.</span>
        </div>

        {status && (
          <p
            className={`database-status ${status.type}`}
            role={status.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {status.text}
          </p>
        )}

        <div className="database-content">
          {profiles.length === 0 ? (
            <div className="database-empty">
              <span aria-hidden="true">+</span>
              <h3>No profiles registered yet</h3>
              <p>Close this window and use the Register panel to add your first profile.</p>
            </div>
          ) : (
            <ul className="database-list">
              {profiles.map((profile) => (
                <li className="database-profile" key={profile.id}>
                  <ProfileThumbnail profile={profile} />

                  {editingId === profile.id ? (
                    <form className="database-edit-form" onSubmit={(event) => saveEdit(event, profile.id)}>
                      <label>
                        Name
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                          required
                        />
                      </label>
                      <div className="database-edit-grid">
                        <label>
                          Age
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={draft.age}
                            onChange={(event) => setDraft({ ...draft, age: event.target.value })}
                            required
                          />
                        </label>
                        <label>
                          Gender
                          <select
                            value={draft.gender}
                            onChange={(event) => setDraft({ ...draft, gender: event.target.value })}
                            required
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                      </div>
                      <div className="database-edit-actions">
                        <button type="submit" className="database-primary" disabled={busyId === profile.id}>
                          {busyId === profile.id ? 'Saving…' : 'Save changes'}
                        </button>
                        <button type="button" className="database-secondary" disabled={Boolean(busyId)} onClick={cancelEdit}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="database-profile-details">
                      <h3>{profile.name}</h3>
                      <dl>
                        <div><dt>Age</dt><dd>{profile.age || 'Not provided'}</dd></div>
                        <div><dt>Gender</dt><dd>{displayGender(profile.gender)}</dd></div>
                        <div><dt>References</dt><dd>{profile.descriptors.length}</dd></div>
                      </dl>

                      {pendingDeleteId === profile.id ? (
                        <div className="database-delete-confirm" role="group" aria-label={`Confirm deleting ${profile.name}`}>
                          <p>Delete {profile.name}? This permanently removes the profile, face data, and saved portrait.</p>
                          <div>
                            <button
                              type="button"
                              className="database-danger"
                              disabled={busyId === profile.id}
                              onClick={() => confirmDelete(profile)}
                            >
                              {busyId === profile.id ? 'Deleting…' : 'Confirm delete'}
                            </button>
                            <button
                              type="button"
                              className="database-secondary"
                              disabled={busyId === profile.id}
                              onClick={() => setPendingDeleteId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="database-profile-actions">
                          <button type="button" className="database-secondary" disabled={Boolean(busyId)} aria-label={`Edit ${profile.name}`} onClick={() => beginEdit(profile)}>Edit</button>
                          <button type="button" className="database-delete" disabled={Boolean(busyId)} aria-label={`Delete ${profile.name}`} onClick={() => requestDelete(profile.id)}>Delete</button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="database-footer">
          <span>Changes apply immediately to recognition results.</span>
          <button type="button" className="database-primary" disabled={Boolean(busyId)} onClick={requestClose}>Done</button>
        </footer>
      </section>
    </div>,
    document.body
  );
}

export default ProfileDatabase;
