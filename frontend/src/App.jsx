import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './App.css';

const API_URL = 'http://localhost:5000/api';

const socket = io('http://localhost:5000', {
  autoConnect: false,
});

function App() {
  const [view, setView] = useState('landing');
  const [role, setRole] = useState('donor');
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [incomingAlert, setIncomingAlert] = useState(null);
  const [chatNotifications, setChatNotifications] = useState({});

  useEffect(() => {
    // Test backend connection on app load
    fetch(`${API_URL.replace('/api', '')}`)
      .then(res => res.json())
      .then(data => console.log('Backend connected:', data))
      .catch(err => console.error('Backend connection failed:', err));
  }, []);

  useEffect(() => {
    if (token && user) {
      if (!socket.connected) {
        socket.connect();
        socket.emit('registerUser', user.id);
      }
      socket.on('emergencyAlert', (alert) => {
        setIncomingAlert(alert);
      });
      socket.on('privateMessage', (msg) => {
        setChatNotifications((prev) => {
          const otherId = msg.from === user.id ? msg.to : msg.from;
          const current = prev[otherId] || 0;
          return { ...prev, [otherId]: current + 1 };
        });
      });
      return () => {
        socket.off('emergencyAlert');
        socket.off('privateMessage');
      };
    }
  }, [token, user]);

  const handleAuthSuccess = (data) => {
    setToken(data.token);
    setUser(data.user);
    setView('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setView('landing');
    setAlerts([]);
  };

  // Determine dashboard view based on role
  const getDashboardView = () => {
    if (!user) return 'auth';
    if (user.role === 'donor') return 'donor-dashboard';
    if (user.role === 'seeker') return 'seeker-dashboard';
    return 'admin-dashboard';
  };

  return (
    <div className="app-shell">
      <header className="app-nav">
        <div className="brand">
          <span className="brand-icon">🩸</span>
          <div>
            <div className="brand-title">Bloodmate</div>
            <div className="brand-subtitle">Save lives, one drop</div>
          </div>
        </div>
        <nav className="nav">
          {token && (
            <>
              <button
                className={view === 'dashboard' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setView('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={view === 'emergency' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setView('emergency')}
              >
                Emergency
              </button>
              <button
                className={view === 'donors' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setView('donors')}
              >
                Donors
              </button>
              <button
                className={view === 'profile' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setView('profile')}
              >
                Profile
              </button>
            </>
          )}
          <div className="nav-cta">
            {!token && (
              <button className="pill-soft" onClick={() => setView('auth')}>
                <span className="dot live" /> Alerts live
              </button>
            )}
            {token && (
              <div className="pill-soft">
                <span className="dot live" /> Live
              </div>
            )}
            {token ? (
              <button className="btn-outline" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <button className="btn-outline" onClick={() => setView('auth')}>
                Login
              </button>
            )}
          </div>
        </nav>
      </header>

      <main className="app-main">
        {!token && view === 'landing' && <Landing onGetStarted={() => setView('auth')} />}
        
        {!token && view === 'auth' && (
          <AuthPanel role={role} setRole={setRole} onSuccess={handleAuthSuccess} />
        )}

        {token && view === 'dashboard' && (
          <DashboardPage user={user} token={token} alerts={alerts} />
        )}

        {token && view === 'emergency' && (
          <EmergencyPage user={user} token={token} alerts={alerts} setAlerts={setAlerts} />
        )}

        {token && view === 'donors' && (
          <DonorDirectory user={user} token={token} chatNotifications={chatNotifications} />
        )}

        {token && view === 'profile' && (
          <ProfilePage user={user} token={token} />
        )}

        {incomingAlert && (
          <div className="toast">
            <div className="toast-title">Emergency request</div>
            <div className="toast-body">
              {incomingAlert.bloodGroup} needed at {incomingAlert.location}
            </div>
            <button className="btn-outline" onClick={() => setIncomingAlert(null)}>
              Dismiss
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function EligibilityPage() {
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const hM = Number(heightCm) > 0 ? Number(heightCm) / 100 : null;
  const w = Number(weightKg) > 0 ? Number(weightKg) : null;
  const bmi = hM && w ? Number((w / (hM * hM)).toFixed(1)) : null;
  const eligible =
    bmi && w
      ? w >= 50 && bmi >= 18.5 && bmi <= 30
      : null;

  return (
    <section className="eligibility-page">
      <div className="eligibility-card">
        <h2>Check if you&apos;re ready to donate</h2>
        <p>
          Enter your height and weight to see your BMI and whether you fall in the safe
          range for donation.
        </p>
        <div className="eligibility-grid">
          <div className="field">
            <label className="field-label">Height (cm)</label>
            <input
              type="number"
              min="120"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="170"
            />
          </div>
          <div className="field">
            <label className="field-label">Weight (kg)</label>
            <input
              type="number"
              min="30"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="65"
            />
          </div>
        </div>
        {bmi && (
          <div className="bmi-result">
            <div className="pill">
              BMI <strong>{bmi}</strong>{' '}
              {eligible
                ? '– Eligible to donate with Bloodmate'
                : '– Not in the recommended range for donation'}
            </div>
            <small>
              Recommended range: weight ≥ 50 kg and BMI between 18.5 and 30. Final
              approval is always done by the medical team at the blood bank.
            </small>
          </div>
        )}
      </div>
    </section>
  );
}

function EmergencyLanding({ onNeedBlood }) {
  return (
    <section className="emergency-page">
      <div className="emergency-card">
        <div className="emergency-badge">Emergency buzzer</div>
        <h2>Need blood right now?</h2>
        <p>
          Create an emergency alert so every eligible donor in the Bloodmate network
          sees your request instantly on their dashboard.
        </p>
        <button className="buzzer-button" onClick={onNeedBlood}>
          <span className="buzzer-pulse" />
          <span role="img" aria-label="siren">
            🚨
          </span>
          <span>Tap to raise alert</span>
        </button>
        <small>
          You&apos;ll be asked to log in as a &quot;Need blood&quot; user so we can attach
          your location and contact details to the alert.
        </small>
      </div>
    </section>
  );
}

function Landing({ onGetStarted }) {
  return (
    <div className="landing-container">
      <section className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-main">Save Lives,</span>
            <span className="hero-gradient">One Drop at a Time</span>
          </h1>
          <p className="hero-subtitle">
            Connect blood donors with those in need. Be a hero in someone's emergency. Join Bloodmate today.
          </p>
          <div className="hero-cta">
            <button className="btn-primary" onClick={onGetStarted}>
              Get Started
            </button>
            <button className="btn-outline" onClick={onGetStarted}>
              Login
            </button>
          </div>
        </div>

        <div className="floating-cards">
          <div className="floating-card card-donate">
            <div className="card-icon">🩸</div>
            <div className="card-label">Donate</div>
          </div>
          <div className="floating-card card-connect">
            <div className="card-icon">❤️</div>
            <div className="card-label">Connect</div>
          </div>
          <div className="floating-card card-emergency">
            <div className="card-icon">🚨</div>
            <div className="card-label">Emergency</div>
          </div>
        </div>
      </section>

      <section className="landing-why">
        <h2>Why Bloodmate?</h2>
        <div className="features-grid">
          <div className="feature">
            <div className="feature-icon">📋</div>
            <h3>Eligibility Check</h3>
            <p>Verify weight, height & BMI to ensure you're eligible before donating.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔔</div>
            <h3>Emergency Buzzer</h3>
            <p>Instant alerts to eligible donors when someone needs blood urgently.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">📍</div>
            <h3>Location Match</h3>
            <p>Find donors near you so you get help fast when it matters most.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">📱</div>
            <h3>Social Feed</h3>
            <p>Stay connected, share stories and build a community of lifesavers.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AuthPanel({ role, setRole, onSuccess }) {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    location: '',
    area: '',
    password: '',
    heightCm: '',
    weightKg: '',
    isPaidDonor: false,
    bloodGroup: 'O+',
  });

  const heightM = Number(form.heightCm) > 0 ? Number(form.heightCm) / 100 : null;
  const weight = Number(form.weightKg) > 0 ? Number(form.weightKg) : null;
  const bmi =
    heightM && weight ? Number((weight / (heightM * heightM)).toFixed(1)) : null;
  const bmiEligible =
    bmi && weight
      ? weight >= 50 && bmi >= 18.5 && bmi <= 30
      : null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: form.phone, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        onSuccess(data);
      } else {
        const payload = {
          role,
          name: form.name,
          phone: form.phone,
          location: form.location,
          area: form.area,
          password: form.password,
        };
        if (role === 'donor') {
          payload.heightCm = Number(form.heightCm);
          payload.weightKg = Number(form.weightKg);
          payload.isPaidDonor = form.isPaidDonor;
          payload.bloodGroup = form.bloodGroup;
        }

        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');
        onSuccess(data);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const isDonor = role === 'donor';

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-icon">🩸</div>
        
        {mode === 'login' ? (
          <>
            <h2>Welcome Back</h2>
            <p>Login to your Bloodmate account</p>
            <form className="form-grid" onSubmit={handleSubmit}>
              <Field label="Phone number">
                <input
                  name="phone"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                />
              </Field>
              <Field label="Password">
                <input
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </Field>
              {error && <div className="error">{error}</div>}
              <button className="btn-primary" disabled={loading} type="submit">
                {loading ? 'Logging in…' : 'Login'}
              </button>
            </form>
            <div className="auth-footer">
              <p>Don't have an account? 
                <button 
                  type="button" 
                  className="link-btn"
                  onClick={() => setMode('register')}
                >
                  Register here
                </button>
              </p>
            </div>
          </>
        ) : (
          <>
            <h2>Join Bloodmate</h2>
            <p>Choose how you want to contribute</p>
            
            <div className="role-selector">
              <button 
                type="button"
                className={`role-btn ${role === 'donor' ? 'active' : ''}`}
                onClick={() => setRole('donor')}
              >
                <div className="role-btn-icon">🩸</div>
                <div className="role-btn-title">I'm a Donor</div>
                <div className="role-btn-subtitle">Save lives by donating</div>
              </button>
              <button 
                type="button"
                className={`role-btn ${role === 'seeker' ? 'active' : ''}`}
                onClick={() => setRole('seeker')}
              >
                <div className="role-btn-icon">❤️</div>
                <div className="role-btn-title">I Need Blood</div>
                <div className="role-btn-subtitle">Find blood when needed</div>
              </button>
            </div>

            <form className="form-grid" onSubmit={handleSubmit}>
              <Field label="Full name">
                <input
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                />
              </Field>
              <Field label="Phone number">
                <input
                  name="phone"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                />
              </Field>
              <Field label="Location">
                <input
                  name="location"
                  required
                  value={form.location}
                  onChange={handleChange}
                  placeholder="City"
                />
              </Field>
              <Field label="Area">
                <input
                  name="area"
                  required
                  value={form.area}
                  onChange={handleChange}
                  placeholder="Locality"
                />
              </Field>
              
              {isDonor && (
                <>
                  <Field label="Blood group">
                    <select
                      name="bloodGroup"
                      value={form.bloodGroup}
                      onChange={handleChange}
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(
                        (bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        )
                      )}
                    </select>
                  </Field>
                  <Field label="Height (cm)">
                    <input
                      name="heightCm"
                      type="number"
                      step="0.1"
                      required
                      value={form.heightCm}
                      onChange={handleChange}
                      placeholder="170"
                    />
                  </Field>
                  <Field label="Weight (kg)">
                    <input
                      name="weightKg"
                      type="number"
                      step="0.1"
                      required
                      value={form.weightKg}
                      onChange={handleChange}
                      placeholder="70"
                    />
                  </Field>
                  {bmi && (
                    <div className="bmi-status">
                      <div className="bmi-content">
                        <span className="bmi-label">BMI:</span>
                        <span className="bmi-value">{bmi}</span>
                        {bmiEligible && (
                          <span className="bmi-badge eligible">✓ Eligible</span>
                        )}
                        {bmiEligible === false && (
                          <span className="bmi-badge ineligible">✗ Ineligible</span>
                        )}
                      </div>
                    </div>
                  )}
                  <Field label="Paid donor?">
                    <input
                      type="checkbox"
                      name="isPaidDonor"
                      checked={form.isPaidDonor}
                      onChange={handleChange}
                    />
                    <span>{form.isPaidDonor ? 'Yes' : 'No'}</span>
                  </Field>
                </>
              )}

              <Field label="Password">
                <input
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </Field>

              {error && <div className="error">{error}</div>}
              <button className="btn-primary" disabled={loading} type="submit">
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
            
            <div className="auth-footer">
              <p>Already have an account? 
                <button 
                  type="button" 
                  className="link-btn"
                  onClick={() => setMode('login')}
                >
                  Login
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DashboardPage({ user, token, alerts }) {
  const [stats, setStats] = useState(null);
  const [nearby, setNearby] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, nearbyRes] = await Promise.all([
          fetch(`${API_URL}/${user.role}/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/donor/nearby`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const dashData = await dashRes.json();
        const nearbyData = await nearbyRes.json();
        if (dashRes.ok) setStats(dashData);
        if (nearbyRes.ok) setNearby(nearbyData);
      } catch (err) {
        console.error('Dashboard load error:', err);
      }
    };
    load();
  }, [token, user.role]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-top">
        <div className="dashboard-header">
          <h1>Welcome, {user.name}! 👋</h1>
          <p>
            {user.role === 'donor'
              ? 'You are helping save lives through blood donation.'
              : user.role === 'seeker'
              ? 'Emergency alerts will be sent to you in real-time.'
              : 'Manage your Bloodmate community'}
          </p>
        </div>

        <div className="dashboard-main">
          <div className="dashboard-left">
            <div className="dashboard-card">
              <h3>📊 Your Statistics</h3>
              {user.role === 'donor' && (
                <div className="stats-content">
                  <div className="stat-row">
                    <span>Total Donations</span>
                    <strong>{stats?.totalDonations ?? 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Blood Group</span>
                    <strong>{user.bloodGroup}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Status</span>
                    <strong>{user.isEligible ? '✅ Eligible' : '⏳ Pending'}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Donor Type</span>
                    <strong>{user.isPaidDonor ? '💰 Paid' : '❤️ Voluntary'}</strong>
                  </div>
                </div>
              )}
              {user.role === 'seeker' && (
                <div className="stats-content">
                  <div className="stat-row">
                    <span>Active Alerts</span>
                    <strong>{alerts?.length ?? 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Location</span>
                    <strong>{user.location}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Contact</span>
                    <strong>{user.phone}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Account</span>
                    <strong>✅ Verified</strong>
                  </div>
                </div>
              )}
              {user.role === 'admin' && (
                <div className="stats-content">
                  <div className="stat-row">
                    <span>Total Users</span>
                    <strong>{stats?.totalUsers ?? 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Total Donors</span>
                    <strong>{stats?.totalDonors ?? 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Active Alerts</span>
                    <strong>{stats?.totalAlerts ?? 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Completed</span>
                    <strong>{stats?.totalDonations ?? 0}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="dashboard-card">
              <h3>📍 Location Information</h3>
              <div className="info-content">
                <p><strong>City:</strong> {user.location}</p>
                <p><strong>Area:</strong> {user.area}</p>
                <p><strong>Phone:</strong> {user.phone}</p>
              </div>
            </div>

            {user.role === 'donor' && (
              <div className="dashboard-card">
                <h3>💪 Health Information</h3>
                <div className="info-content">
                  <p><strong>Height:</strong> {user.heightCm} cm</p>
                  <p><strong>Weight:</strong> {user.weightKg} kg</p>
                  <p><strong>Eligible to Donate:</strong> {user.isEligible ? '✅ Yes' : '⏳ Pending Verification'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="dashboard-right">
            <div className="dashboard-card">
              <h3>🤝 Available Donors Near You</h3>
              {nearby && nearby.length > 0 ? (
                <div className="donors-list">
                  {nearby.slice(0, 6).map((d) => (
                    <div key={d._id} className="donor-item">
                      <div className="donor-name">{d.name}</div>
                      <div className="donor-info">
                        <span className="donor-blood">{d.bloodGroup}</span>
                        <span className="donor-location">{d.area}</span>
                      </div>
                      <div className="donor-contact">📱 {d.phone}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No donors available in your area yet.</p>
              )}
            </div>

            {alerts && alerts.length > 0 && (
              <div className="dashboard-card">
                <h3>📢 Recent Alerts</h3>
                <div className="alerts-list">
                  {alerts.slice(0, 5).map((a) => (
                    <div key={a._id} className="alert-item">
                      <div className="alert-blood">{a.bloodGroup}</div>
                      <div className="alert-info">
                        <div className="alert-location">📍 {a.location}</div>
                        <div className="alert-message">{a.message.substring(0, 50)}...</div>
                        <div className="alert-time">{new Date(a.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DonorDashboard({ user, token }) {
  const [stats, setStats] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [dashRes, alertsRes, nearbyRes] = await Promise.all([
        fetch(`${API_URL}/donor/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/donor/nearby`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const dashData = await dashRes.json();
      const alertsData = await alertsRes.json();
      const nearbyData = await nearbyRes.json();
      if (dashRes.ok) setStats(dashData);
      if (alertsRes.ok) setAlerts(alertsData);
      if (nearbyRes.ok) setNearby(nearbyData);
    };
    load();
  }, [token]);

  return (
    <div className="panel">
      <header className="panel-header">
        <h1>Welcome, {user.name}</h1>
        <p>
          {user.isEligible
            ? 'You are eligible to donate blood.'
            : 'You are registered. A coordinator will verify your eligibility.'}
        </p>
        <div className="pill-row">
          <div className="pill">
            Blood group <strong>{user.bloodGroup}</strong>
          </div>
          <div className="pill">
            {user.isPaidDonor ? 'Paid donor' : 'Voluntary donor'}
          </div>
        </div>
      </header>
      <div className="panel-grid">
        <div className="card metric">
          <div className="metric-label">Total donations</div>
          <div className="metric-value">{stats?.totalDonations ?? '—'}</div>
        </div>
        <div className="card">
          <h3>Recent donations</h3>
          <ul className="list">
            {stats?.recentDonations && stats.recentDonations.length > 0 ? (
              stats.recentDonations.map((d) => (
                <li key={d._id}>
                  <div>
                    {d.bloodGroup} • {d.location}
                  </div>
                  <small>{new Date(d.createdAt).toLocaleString()}</small>
                </li>
              ))
            ) : (
              <li>No donations recorded yet.</li>
            )}
          </ul>
        </div>
        <div className="card">
          <h3>Certificate</h3>
          <p>
            After each completed donation, a digital certificate will appear here
            that you can download and share.
          </p>
        </div>
        <div className="card">
          <h3>Available donors near you</h3>
          <p className="muted">
            Donors registered in your city, visible to coordinators during emergencies.
          </p>
          <ul className="list">
            {nearby.map((d) => (
              <li key={d._id}>
                <div>
                  <strong>{d.name}</strong> • {d.bloodGroup}
                </div>
                <small>
                  {d.area} · {d.isPaidDonor ? 'Paid' : 'Free'} donor
                </small>
              </li>
            ))}
            {nearby.length === 0 && <li>No other donors in your location yet.</li>}
          </ul>
        </div>
        <div className="card">
          <h3>Emergency alerts</h3>
          <ul className="list">
            {alerts.map((a) => (
              <li key={a._id}>
                <div>
                  <strong>{a.bloodGroup}</strong> needed at {a.location}
                </div>
                <small>{a.message}</small>
              </li>
            ))}
            {alerts.length === 0 && <li>No active alerts right now.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function EmergencyPage({ user, token, alerts, setAlerts }) {
  const [form, setForm] = useState({
    bloodGroup: 'O+',
    location: user?.location || '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [nearbyDonors, setNearbyDonors] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setAlerts(data);
      } catch (err) {
        console.error('Load alerts error:', err);
      }
    };
    load();
  }, [token, setAlerts]);

  useEffect(() => {
    const loadNearby = async () => {
      try {
        const res = await fetch(
          `${API_URL}/donor/nearby?bloodGroup=${encodeURIComponent(form.bloodGroup)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (res.ok) setNearbyDonors(data);
      } catch (err) {
        console.error('Load donors error:', err);
      }
    };
    loadNearby();
  }, [token, form.bloodGroup]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setAlerts((prev) => [data, ...prev]);
        setForm((prev) => ({ ...prev, message: '' }));
      }
    } catch (err) {
      console.error('Submit alert error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel emergency-page">
      <header className="panel-header">
        <h1>🆘 Emergency Blood Request</h1>
        <p>Send an urgent alert to all eligible donors in your network.</p>
      </header>

      <div className="emergency-grid">
        <form className="emergency-form">
          <h3>Create Emergency Alert</h3>
          <Field label="Blood Group Required *">
            <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
              <option>A+</option>
              <option>A-</option>
              <option>B+</option>
              <option>B-</option>
              <option>O+</option>
              <option>O-</option>
              <option>AB+</option>
              <option>AB-</option>
            </select>
          </Field>
          <Field label="Location / Hospital *">
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Hospital name and address"
            />
          </Field>
          <Field label="Urgent Details *">
            <textarea
              name="message"
              required
              value={form.message}
              onChange={handleChange}
              placeholder="Patient condition, urgency level, units needed..."
              rows={4}
            />
          </Field>
          <button className="btn-primary emergency-btn" type="submit" disabled={loading} onClick={handleSubmit}>
            {loading ? '⏳ Sending Alert...' : '🚨 Send Emergency Alert'}
          </button>
        </form>

        <div className="emergency-info">
          <div className="active-alerts">
            <h3>📢 Your Alerts</h3>
            {alerts && alerts.length > 0 ? (
              <ul className="alerts-list">
                {alerts.slice(0, 5).map((a) => (
                  <li key={a._id} className="alert-item">
                    <div className="alert-header">
                      <strong>{a.bloodGroup}</strong>
                      <span className="alert-time">{new Date(a.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="alert-location">📍 {a.location}</div>
                    <div className="alert-message">{a.message}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No active alerts yet.</p>
            )}
          </div>

          <div className="nearby-donors-emergency">
            <h3>🤝 Available Donors ({form.bloodGroup})</h3>
            {nearbyDonors.length > 0 ? (
              <ul className="donors-emergency-list">
                {nearbyDonors.slice(0, 5).map((d) => (
                  <li key={d._id} className="donor-item-emergency">
                    <div className="donor-header">
                      <strong>{d.name}</strong>
                      <span className="blood-badge">{d.bloodGroup}</span>
                    </div>
                    <div className="donor-details">
                      <span>📍 {d.area}</span>
                      <span>📱 {d.phone}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No donors available for {form.bloodGroup} blood group.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SeekerDashboard({ user, token, alerts, setAlerts }) {
  const [form, setForm] = useState({
    bloodGroup: 'O+',
    location: user.location,
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [nearbyDonors, setNearbyDonors] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${API_URL}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setAlerts(data);
    };
    load();
  }, [token, setAlerts]);

  useEffect(() => {
    const loadNearby = async () => {
      const res = await fetch(
        `${API_URL}/donor/nearby?bloodGroup=${encodeURIComponent(form.bloodGroup)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (res.ok) setNearbyDonors(data);
    };
    loadNearby();
  }, [token, form.bloodGroup]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setAlerts((prev) => [data, ...prev]);
        setForm((prev) => ({ ...prev, message: '' }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <header className="panel-header">
        <h1>Emergency requests</h1>
        <p>
          When you submit an alert, everyone in the Bloodmate network sees it
          instantly and can respond.
        </p>
      </header>
      <div className="panel-grid">
        <form className="card" onSubmit={handleSubmit}>
          <h3>New emergency alert</h3>
          <Field label="Blood group">
            <select
              name="bloodGroup"
              value={form.bloodGroup}
              onChange={handleChange}
            >
              <option>A+</option>
              <option>A-</option>
              <option>B+</option>
              <option>B-</option>
              <option>O+</option>
              <option>O-</option>
              <option>AB+</option>
              <option>AB-</option>
            </select>
          </Field>
          <Field label="Location">
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
            />
          </Field>
          <Field label="Details">
            <textarea
              name="message"
              required
              value={form.message}
              onChange={handleChange}
              placeholder="Hospital name, patient details, urgency…"
              rows={3}
            />
          </Field>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send emergency alert'}
          </button>
        </form>
        <div className="card">
          <h3>Your alerts</h3>
          <ul className="list">
            {alerts.map((a) => (
              <li key={a._id}>
                <div>
                  <strong>{a.bloodGroup}</strong> • {a.location}
                </div>
                <small>{a.message}</small>
                <br />
                <small>{new Date(a.createdAt).toLocaleString()}</small>
              </li>
            ))}
            {alerts.length === 0 && <li>No alerts yet.</li>}
          </ul>
        </div>
        <div className="card">
          <h3>Available donors near you</h3>
          <p className="muted">
            Matching your selected blood group in your city.
          </p>
          <ul className="list">
            {nearbyDonors.map((d) => (
              <li key={d._id}>
                <div>
                  <strong>{d.name}</strong> • {d.bloodGroup}
                </div>
                <small>
                  {d.area} · {d.isPaidDonor ? 'Paid' : 'Free'} donor
                </small>
              </li>
            ))}
            {nearbyDonors.length === 0 && <li>No donors found yet for this group.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ user, token }) {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [statsRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const statsData = await statsRes.json();
      const alertsData = await alertsRes.json();
      if (statsRes.ok) setStats(statsData);
      if (alertsRes.ok) setAlerts(alertsData);
    };
    load();
  }, [token]);

  return (
    <div className="panel">
      <header className="panel-header">
        <h1>Admin overview</h1>
        <p>High-level summary of how your Bloodmate community is doing.</p>
      </header>
      <div className="panel-grid">
        <div className="card metric">
          <div className="metric-label">Total registrations</div>
          <div className="metric-value">{stats?.totalUsers ?? '—'}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Donors</div>
          <div className="metric-value">{stats?.totalDonors ?? '—'}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">People needing blood</div>
          <div className="metric-value">{stats?.totalSeekers ?? '—'}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Completed donations</div>
          <div className="metric-value">{stats?.totalDonations ?? '—'}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Active alerts</div>
          <div className="metric-value">{stats?.totalAlerts ?? '—'}</div>
        </div>
        <div className="card">
          <h3>Latest emergency alerts</h3>
          <ul className="list">
            {alerts.map((a) => (
              <li key={a._id}>
                <div>
                  <strong>{a.bloodGroup}</strong> at {a.location}
                </div>
                <small>{a.message}</small>
              </li>
            ))}
            {alerts.length === 0 && <li>No active alerts.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function DonorDirectory({ user, token, chatNotifications }) {
  const [bloodGroup, setBloodGroup] = useState('all');
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params =
          bloodGroup !== 'all' ? `?bloodGroup=${encodeURIComponent(bloodGroup)}` : '';
        const res = await fetch(`${API_URL}/donor/nearby${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setDonors(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, bloodGroup]);

  useEffect(() => {
    if (!selected) return;
    const loadMessages = async () => {
      const res = await fetch(`${API_URL}/messages/${selected._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setMessages(data);
    };
    loadMessages();
  }, [selected, token]);

  useEffect(() => {
    if (!selected) return;
    const handler = (msg) => {
      if (
        (msg.from === selected._id && msg.to === user.id) ||
        (msg.to === selected._id && msg.from === user.id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on('privateMessage', handler);
    return () => socket.off('privateMessage', handler);
  }, [selected, user]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selected || !input.trim()) return;
    const body = input.trim();
    setInput('');
    const res = await fetch(`${API_URL}/messages/${selected._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessages((prev) => [...prev, data]);
    }
  };

  return (
    <section className="donor-directory">
      <div className="donor-list">
        <header className="donor-list-header">
          <h2>Available donors near you</h2>
          <p>Select a donor to view details and start a chat.</p>
          <div className="donor-filters">
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
            >
              <option value="all">Any group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
        </header>
        <div className="donor-list-body">
          {loading && <div className="muted">Loading donors…</div>}
          {!loading &&
            donors.map((d) => (
              <button
                key={d._id}
                className={
                  selected?._id === d._id ? 'donor-row donor-row-active' : 'donor-row'
                }
                onClick={() => {
                  setSelected(d);
                  setMessages([]);
                }}
              >
                <div className="donor-avatar">
                  <span>{d.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="donor-info">
                  <div className="donor-name-row">
                    <span className="donor-name">{d.name}</span>
                    <span className="donor-badge">{d.bloodGroup}</span>
                  </div>
                  <div className="donor-meta">
                    <span>{d.location}</span>
                    <span>·</span>
                    <span>{d.area}</span>
                    <span>·</span>
                    <span>{d.isPaidDonor ? 'Paid donor' : 'Free donor'}</span>
                  </div>
                  <div className="donor-contact">
                    <a href={`tel:${d.phone}`}>{d.phone}</a>
                  </div>
                </div>
                {chatNotifications[d._id] > 0 && (
                  <span className="donor-unread">{chatNotifications[d._id]}</span>
                )}
              </button>
            ))}
          {!loading && donors.length === 0 && (
            <div className="muted">No donors found for this filter.</div>
          )}
        </div>
      </div>
      <div className="chat-panel">
        {selected ? (
          <>
            <header className="chat-header">
              <div>
                <div className="chat-name">{selected.name}</div>
                <div className="chat-sub">
                  {selected.bloodGroup} · {selected.location}, {selected.area}
                </div>
              </div>
            </header>
            <div className="chat-messages">
              {messages.map((m) => (
                <div
                  key={m._id}
                  className={
                    m.from === user.id ? 'chat-bubble mine' : 'chat-bubble their'
                  }
                >
                  <div className="chat-text">{m.body}</div>
                  <div className="chat-time">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="muted">Say hi and coordinate the donation details.</div>
              )}
            </div>
            <form className="chat-input-row" onSubmit={handleSend}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
              />
              <button className="btn-primary" type="submit">
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty">
            <h3>Select a donor</h3>
            <p>Choose a donor from the list to view details and start a chat.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {children}
    </div>
  );
}

function ProfilePage({ user, token }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(user || {});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="panel profile-page">
      <header className="panel-header">
        <h1>👤 My Profile</h1>
        <p>Manage your account information and settings.</p>
      </header>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="profile-info">
              <h2>{user.name}</h2>
              <p>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
            </div>
            <button
              className="btn-outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? '❌ Cancel' : '✏️ Edit'}
            </button>
          </div>

          <div className="profile-details">
            <div className="detail-row">
              <span className="detail-label">📱 Phone</span>
              <span className="detail-value">{user.phone}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">📍 City</span>
              <span className="detail-value">{user.location}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">🏘️ Area</span>
              <span className="detail-value">{user.area}</span>
            </div>
            {user.role === 'donor' && (
              <>
                <div className="detail-row">
                  <span className="detail-label">🩸 Blood Group</span>
                  <span className="detail-value">{user.bloodGroup}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">📏 Height</span>
                  <span className="detail-value">{user.heightCm} cm</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">⚖️ Weight</span>
                  <span className="detail-value">{user.weightKg} kg</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">💰 Donor Type</span>
                  <span className="detail-value">{user.isPaidDonor ? 'Paid Donor' : 'Voluntary Donor'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">✅ Status</span>
                  <span className="detail-value">{user.isEligible ? 'Eligible' : 'Pending Verification'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="profile-stats">
          <h3>📊 Activity Stats</h3>
          {user.role === 'donor' && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Donations Made</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Lives Saved</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Alerts Responded</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Hours Spent</div>
              </div>
            </div>
          )}
          {user.role === 'seeker' && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Alerts Created</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Donors Contacted</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Successful Matches</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Blood Units Received</div>
              </div>
            </div>
          )}
          {user.role === 'admin' && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Total Users</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Active Alerts</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Completed Donations</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">0</div>
                <div className="stat-name">Platform Health</div>
              </div>
            </div>
          )}
        </div>

        <div className="account-settings">
          <h3>⚙️ Account Settings</h3>
          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-title">🔔 Notifications</div>
              <p>Receive alerts and updates</p>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span>Enabled</span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-title">📧 Email Updates</div>
              <p>Get monthly activity summaries</p>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span>Enabled</span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-title">🔐 Privacy</div>
              <p>Control who can see your profile</p>
              <select>
                <option>Public</option>
                <option>Private</option>
                <option>Friends Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
