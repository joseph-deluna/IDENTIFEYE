import React, { useState } from 'react';

function SquareThree() {
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    gender: '',
  });
  const [images, setImages] = useState([]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setImages(e.target.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', profile.name);
    formData.append('age', profile.age);
    formData.append('gender', profile.gender);
    Array.from(images).forEach(image => {
      formData.append('images', image);
    });

    try {
      const response = await fetch('http://localhost:3001/api/profiles', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        alert('Profile added successfully');
        setProfile({ name: '', age: '', gender: '' });
        setImages([]);
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (error) {
      alert(`Failed to add profile: ${error.message}`);
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
        <input type="file" multiple onChange={handleFileChange} accept="image/*" />
        <button type="submit">Submit Profile</button>
      </form>
    </div>
  );
}

export default SquareThree;
