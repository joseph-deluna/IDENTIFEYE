import React, { useRef, useState } from 'react';
import { createReferenceDescriptors, loadFaceModels } from '../lib/faceRecognition';
import { loadStoredProfiles, saveStoredProfiles, upsertProfile } from '../lib/profileStore';
import {
  deleteProfileImage,
  loadProfileImage,
  saveProfileImage,
} from '../lib/profileImageStore';

function SquareThree({ onViewDatabase, onProfilesChanged }) {
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    gender: '',
  });
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setStatus(null);
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setStatus(null);
    setImages(Array.from(e.target.files || []));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!images.length) {
      setStatus({ type: 'error', text: 'Please choose at least one clear profile image.' });
      return;
    }

    setIsLoading(true);
    setStatus(null);
    try {
      await loadFaceModels();
      const descriptors = await createReferenceDescriptors(images);
      const saved = upsertProfile(loadStoredProfiles(), profile, descriptors);
      const previousImage = await loadProfileImage(saved.profile.id);
      await saveProfileImage(saved.profile.id, images[0]);

      try {
        saveStoredProfiles(saved.profiles);
      } catch (storageError) {
        try {
          if (previousImage) {
            await saveProfileImage(saved.profile.id, previousImage);
          } else {
            await deleteProfileImage(saved.profile.id);
          }
        } catch (rollbackError) {
          console.error('Unable to restore the previous profile image:', rollbackError);
        }
        throw storageError;
      }
      setStatus({
        type: 'success',
        text: saved.updated ? 'Profile updated successfully.' : 'Profile added successfully.',
      });
      onProfilesChanged?.();
      setProfile({ name: '', age: '', gender: '' });
      setImages([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setStatus({ type: 'error', text: `Failed to add profile: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="square square-three">
      <div className="panel-heading">
        <span className="panel-number">03 · REGISTER</span>
        <h2>Add Profile</h2>
        <p>Create or update a profile using one or more clear portraits.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="profile-name">Name</label>
        <input id="profile-name" type="text" name="name" value={profile.name} onChange={handleChange} placeholder="Name" required />
        <label className="sr-only" htmlFor="profile-age">Age</label>
        <input id="profile-age" type="number" name="age" min="1" max="120" value={profile.age} onChange={handleChange} placeholder="Age" required />
        <label className="sr-only" htmlFor="profile-gender">Gender</label>
        <select id="profile-gender" name="gender" value={profile.gender} onChange={handleChange} required>
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <label className="profile-photo-label" htmlFor="profile-images">Reference photos</label>
        <input id="profile-images" ref={fileInputRef} type="file" multiple onChange={handleFileChange} accept="image/*" />
        {images.length > 0 && (
          <span className="selected-files">{images.length} photo{images.length === 1 ? '' : 's'} selected · first photo used for the profile</span>
        )}
        <button type="submit" disabled={isLoading}>{isLoading ? 'Saving profile…' : 'Submit Profile'}</button>
        <button className="database-open-button" type="button" onClick={onViewDatabase}>View Database</button>
        {status && (
          <p className={`form-status ${status.type}`} role="status" aria-live="polite">{status.text}</p>
        )}
      </form>
    </div>
  );
}

export default SquareThree;
