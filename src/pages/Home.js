import React, { useCallback, useEffect, useState } from 'react';
import SquareThree from '../components/SquareThree';
import SquareTwo from '../components/SquareTwo';
import SquareOne from '../components/SquareOne';
import ProfileDatabase from '../components/ProfileDatabase';
import navLogo from '../img/identifeye-logo-transparent.png';
import { PROFILE_STORAGE_KEY } from '../lib/profileStore';

import '../App.css';

function Home({ onLogout }) {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [profileRevision, setProfileRevision] = useState(0);

  const handleImageUpload = (image) => {
    setUploadedImage(image);
  };

  const [, setRecognitionResult] = useState(null);

  const handleRecognitionComplete = (result) => {
    setRecognitionResult(result.message);
  };

  const handleProfilesChanged = useCallback(() => {
    setProfileRevision((revision) => revision + 1);
  }, []);
  const openDatabase = useCallback(() => setIsDatabaseOpen(true), []);
  const closeDatabase = useCallback(() => setIsDatabaseOpen(false), []);

  useEffect(() => {
    const handleProfileStorageChange = (event) => {
      if (event.key === PROFILE_STORAGE_KEY) handleProfilesChanged();
    };
    window.addEventListener('storage', handleProfileStorageChange);
    return () => window.removeEventListener('storage', handleProfileStorageChange);
  }, [handleProfilesChanged]);

  return (
    <div className="home-page">
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar-inner">
          <div className="navbar-brand">
            <img className="navbar-logo" src={navLogo} alt="" />
            <span>IDENTIFEYE</span>
          </div>
          <button className="logout-button" type="button" onClick={onLogout}>Log out</button>
        </div>
      </nav>
      <main className="workspace" aria-label="Face recognition workspace">
        <div className="squares-container">
          <div className="App">
            <SquareOne onImageUpload={handleImageUpload} />
            <SquareTwo
              uploadedImage={uploadedImage}
              onRecognitionComplete={handleRecognitionComplete}
              profileRevision={profileRevision}
            />
            <SquareThree
              onViewDatabase={openDatabase}
              onProfilesChanged={handleProfilesChanged}
            />
          </div>
        </div>
      </main>
      <ProfileDatabase
        isOpen={isDatabaseOpen}
        onClose={closeDatabase}
        onProfilesChanged={handleProfilesChanged}
      />
    </div>
  );
}

export default Home;
