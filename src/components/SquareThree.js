import React, { useRef, useState } from 'react';
import { createReferenceDescriptors, loadFaceModels } from '../lib/faceRecognition';
import { loadStoredProfiles, saveStoredProfiles, upsertProfile } from '../lib/profileStore';

function SquareThree() {
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    gender: '',
  });
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setImages(Array.from(e.target.files || []));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!images.length) {
      alert('Please choose at least one clear profile image.');
      return;
    }

    setIsLoading(true);
    try {
      await loadFaceModels();
      const descriptors = await createReferenceDescriptors(images);
      const saved = upsertProfile(loadStoredProfiles(), profile, descriptors);
      saveStoredProfiles(saved.profiles);
      alert(saved.updated ? 'Profile updated successfully' : 'Profile added successfully');
      setProfile({ name: '', age: '', gender: '' });
      setImages([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      alert(`Failed to add profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="square square-three">
      <h2>Add Profile</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" value={profile.name} onChange={handleChange} placeholder="Name" required />
        <input type="number" name="age" value={profile.age} onChange={handleChange} placeholder="Age" required />
        <select name="gender" value={profile.gender} onChange={handleChange} required>
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} accept="image/*" />
        <button type="submit">Submit Profile</button>
      </form>
    </div>
  );
}

export default SquareThree;
