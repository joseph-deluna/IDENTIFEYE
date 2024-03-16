import React, { useState } from 'react';

// Inside SquareOne component
function SquareOne({ onImageUpload }) {
  // Assuming you have a state to hold the uploaded image URL
  const [imageUrl, setImageUrl] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
        onImageUpload(file); // If you need to lift the state up or process the file
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="square">
      <input 
        type="file" 
        onChange={handleImageChange} 
        accept="image/*" 
        className="file-input"
        id="fileInput"
      />
      <label htmlFor="fileInput" className="square-content">
        {imageUrl ? <img src={imageUrl} alt="Uploaded" className="uploaded-image" /> : "Upload Image"}
      </label>
    </div>
  );
}


export default SquareOne;
