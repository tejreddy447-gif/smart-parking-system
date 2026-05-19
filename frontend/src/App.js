import React, { useState, useEffect } from 'react';

function App() {
  const [slots, setSlots] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Replace this placeholder string with your actual live Render URL!
  const API_BASE_URL = "https://smart-parking-backend-0hqz.onrender.com";
  
  // Admin Panel states
  const [showAdmin, setShowAdmin] = useState(false);
  const [maxDays, setMaxDays] = useState(30);
  const [termClause, setTermClause] = useState("");
  const [liabClause, setLiabClause] = useState("");
  
  const [newSlotId, setNewSlotId] = useState("");
  const [newSlotType, setNewSlotType] = useState("Standard");
  const [newSlotDist, setNewSlotDist] = useState("");

  // 1. Fetch Parking Grid
  useEffect(() => {
    const fetchParking = () => {
      fetch(`${API_BASE_URL}/parking/status`)
        .then(res => res.json())
        .then(data => setSlots(data))
        .catch(err => console.error("Backend unreachable:", err));
    };
    fetchParking();
    const interval = setInterval(fetchParking, 5000);
    return () => clearInterval(interval);
  }, [API_BASE_URL]);

  // 2. Fetch Existing Playbook Rules on Load
  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/playbook`)
      .then(res => res.json())
      .then(data => {
        setMaxDays(data.termination_notice.max_days);
        setTermClause(data.termination_notice.standard_clause);
        setLiabClause(data.liability_cap.standard_clause);
      })
      .catch(err => console.log("Admin playbook setup failed"));
  }, [API_BASE_URL]);

  // NEW FEATURE: Handle User Slot Booking Selection
  const handleBookSlot = async (slotId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/book-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: slotId })
      });
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        // Optimistically update frontend state right away
        setSlots(prevSlots => 
          prevSlots.map(slot => slot.id === slotId ? { ...slot, status: 'occupied' } : slot)
        );
      } else {
        alert(data.detail || "Booking failed.");
      }
    } catch (error) {
      alert("Network error trying to process slot booking");
    }
  };

  // 3. Document Analysis Submit
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_BASE_URL}/contract/review`, { method: 'POST', body: formData });
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      alert("Error analyzing contract");
    } finally { setLoading(false); }
  };

  // 4. Admin Form Submit: Playbook Policies
  const handlePlaybookUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/admin/update-playbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_days: maxDays, termination_clause: termClause, liability_clause: liabClause })
      });
      const resData = await response.json();
      alert(resData.message || "Rules Updated!");
    } catch (err) { alert("Failed to update playbook"); }
  };

  // 5. Admin Form Submit: Add Parking Slot
  const handleAddSlot = async (e) => {
    e.preventDefault();
    if(!newSlotId || !newSlotDist) return alert("Fill out slot fields!");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/add-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(newSlotId), type: newSlotType, distance: parseInt(newSlotDist) })
      });
      const resData = await response.json();
      if(response.ok) {
        alert(resData.message || "New sensor spot provisioned!");
        setNewSlotId("");
        setNewSlotDist("");
      } else { 
        alert(resData.detail || "Failed to append spot"); 
      }
    } catch (err) { alert("Error connecting to server"); }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      
      {/* HEADER WITH ADMIN TOGGLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#1a73e8', margin: 0 }}>Smart City & Legal AI Dashboard</h1>
        <button 
          onClick={() => setShowAdmin(!showAdmin)} 
          style={{ padding: '10px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          {showAdmin ? "🔒 Close Panel" : "⚙️ Open Admin Panel"}
        </button>
      </div>

      {/* --- ADMINISTRATIVE CONTROL SUITE --- */}
      {showAdmin && (
        <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '12px', border: '1px solid #ffeeba', marginBottom: '30px' }}>
          <h2 style={{ color: '#856404', marginTop: 0 }}>🛡️ Administrator Workspace</h2>
          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            
            {/* Form A: Rules Engine Modification */}
            <form onSubmit={handlePlaybookUpdate} style={{ flex: 1, minWidth: '300px' }}>
              <h3>Modify Legal Playbook Requirements</h3>
              <label>Max Allowed Notice Days:</label><br/>
              <input type="number" value={maxDays} onChange={(e) => setMaxDays(e.target.value)} style={{ width: '100%', padding: '6px', margin: '6px 0' }} /><br/>
              <label>Standard Termination Suggestion:</label><br/>
              <textarea value={termClause} onChange={(e) => setTermClause(e.target.value)} style={{ width: '100%', padding: '6px', margin: '6px 0', height: '60px' }} /><br/>
              <label>Standard Liability Cap Suggestion:</label><br/>
              <textarea value={liabClause} onChange={(e) => setLiabClause(e.target.value)} style={{ width: '100%', padding: '6px', margin: '6px 0', height: '60px' }} /><br/>
              <button type="submit" style={{ padding: '8px 15px', background: '#856404', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Apply Policy Updates</button>
            </form>

            {/* Form B: Hardwiring Infrastructure */}
            <form onSubmit={handleAddSlot} style={{ flex: 1, minWidth: '300px' }}>
              <h3>Add New Parking Slot Sensors</h3>
              <label>Slot ID (Number):</label><br/>
              <input type="number" value={newSlotId} onChange={(e) => setNewSlotId(e.target.value)} style={{ width: '100%', padding: '6px', margin: '6px 0' }} /><br/>
              <label>Bay Designation:</label><br/>
              <select value={newSlotType} onChange={(e) => setNewSlotType(e.target.value)} style={{ width: '100%', padding: '6px', margin: '6px 0' }}>
                <option value="Standard">Standard Grid</option>
                <option value="EV Charging">EV Charging Station</option>
                <option value="Handicap">Handicap Accessible</option>
              </select><br/>
              <label>Distance to Terminal Gate (meters):</label><br/>
              <input type="number" value={newSlotDist} onChange={(e) => setNewSlotDist(e.target.value)} style={{ width: '100%', padding: '6px', margin: '6px 0' }} /><br/>
              <button type="submit" style={{ padding: '8px 15px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Provision Bay Sensors</button>
            </form>

          </div>
        </div>
      )}

      {/* --- STANDARD SMART PARKING GRID VIEW --- */}
      <section style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <h2>🚗 Real-Time Smart Parking Deck</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {Array.isArray(slots) && slots.length > 0 ? (
            slots.map(slot => (
              <div key={slot.id} style={{
                padding: '15px', borderRadius: '10px', border: '2px solid #333', textAlign: 'center',
                backgroundColor: slot.status === 'vacant' ? '#d4edda' : '#f8d7da',
                color: slot.status === 'vacant' ? '#155724' : '#721c24',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Slot {slot.id}</div>
                  <div style={{ fontSize: '0.85em' }}>{slot.type}</div>
                  <div style={{ fontSize: '0.8em', fontStyle: 'italic' }}>{slot.distance}m away</div>
                  <div style={{ marginTop: '5px', fontWeight: 'bold', fontSize: '0.75em', textTransform: 'uppercase' }}>{slot.status}</div>
                </div>
                
                {/* NEW FEATURE ACTION BUTTON: Allows normal user to click and book directly */}
                {slot.status === 'vacant' && (
                  <button 
                    onClick={() => handleBookSlot(slot.id)}
                    style={{
                      marginTop: '10px', padding: '5px 10px', background: '#155724', color: '#fff',
                      border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75em', fontWeight: 'bold'
                    }}>
                    Reserve Slot
                  </button>
                )}
              </div>
            ))
          ) : ( <p>Awaiting active stream telemetry...</p> )}
        </div>
      </section>

      {/* --- STANDARD LEGAL ASSISTANT UPLOAD SECTION --- */}
      <section style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2>⚖️ AI Contract Review Suite</h2>
        <input type="file" onChange={handleFileUpload} />
        {loading && <p>AI assessing syntax patterns...</p>}
        {analysis && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '5px solid #1a73e8' }}>
            <h3>Filename: {analysis.filename} (Risk Matrix: {analysis.overall_risk})</h3>
            <ul>
              {analysis.analysis.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '10px' }}>
                  <strong>{item.clause}:</strong> System spotted <code style={{background:'#fff', padding:'2px'}}>{item.found}</code>. <br/>
                  <span style={{color: '#1a73e8'}}>Compliance Fix:</span> "{item.suggestion}"
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

    </div>
  );
}

export default App;