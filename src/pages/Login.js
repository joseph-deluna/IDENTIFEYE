import React, { useState } from 'react';
import loginLogo from '../img/identifeye-logo-transparent.png';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setError('');
      onLogin();
    } else {
      setError('That username or password is not correct. Try the demo access below.');
    }
  };

  return (
    <div className="login-container">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <img className="login-logo" src={loginLogo} alt="" />
          <span>IDENTIFEYE</span>
        </div>
        <h1 id="login-title">Welcome back</h1>
        <p className="login-subtitle">Secure, on-device face recognition for this portfolio demonstration.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            autoComplete="username"
            placeholder="Enter username"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            autoComplete="current-password"
            placeholder="Enter password"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
            required
          />
          {error && <p id="login-error" className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit">Sign in</button>
        </form>
        <p className="demo-access"><span>Demo access</span><strong>admin</strong> / <strong>admin</strong></p>
      </section>
    </div>
  );
}

export default Login;
