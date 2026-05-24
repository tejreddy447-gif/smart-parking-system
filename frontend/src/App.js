import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';

function App() {
  const [slots, setSlots] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Hardwired straight to your live deployment server
  const API_BASE_URL = "https://smart-parking-backend.onrender.com";
  
  // Admin Panel states
  const [showAdmin, setShowAdmin] = useState(false);
  const [maxDays, setMaxDays] = useState(30);
  const [termClause, setTermClause] = useState("");
  const [liabClause, setLiabClause] = useState("");
  
  // Add single slot states
  const [newSlotId, setNewSlotId] = useState("");
  const [newSlotType, setNewSlotType] = useState("Car");
  const [newSlotDist, setNewSlotDist] = useState("");

  // Macro Grid Config states
  const [macroTotalSlots, setMacroTotalSlots] = useState(20);
  const [macroMotorbikeCount, setMacroMotorbikeCount] = useState(10);

  // 1. Fetch Parking Grid on Loop (5s Telemetry Feed)
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
        if(data) {
          setMaxDays(data.termination_notice.max_days);
          setTermClause(data.termination_notice.standard_clause);
          setLiabClause(data.liability_cap.standard_clause);
        }
      })
      .catch(err => console.log("Admin playbook setup initialization deferred"));
  }, [API_BASE_URL]);

  // 3. Handle User Slot Booking Selection
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
        setSlots(prevSlots => 
          prevSlots.map(slot => slot.id === slotId ? { ...slot, status: 'occupied' } : slot)
        );
      } else {
        alert(data.detail || "Booking transaction failed.");
      }
    } catch (error) {
      alert("Network error trying to process slot booking");
    }
  };

  // 4. Macro Reconfigure: Overwrite entire infrastructure density
  const handleMacroReconfig = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reconfigure-grid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          total_slots: parseInt(macroTotalSlots), 
          motorbike_count: parseInt(macroMotorbikeCount) 
        })
      });
      const data = await response.json();
      if(response.ok) {
        alert(data.message || "Grid wiped and reconfigured successfully!");
      } else {
        alert(data.detail || "Failed to adjust grid macro structure.");
      }
    } catch (err) {
      alert("Error communicating with reconfigure engine.");
    }
  };

  // 5. Document Analysis Submit
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
      alert("Error analyzing contract templates");
    } finally { setLoading(false); }
  };

  // 6. Admin Form Submit: Playbook Policies
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
    } catch (err) { alert("Failed to update playbook compliance matrix"); }
  };

  // 7. Admin Form Submit: Append Single Tailored Parking Slot
  const handleAddSlot = async (e) => {
    e.preventDefault();
    if(!newSlotId || !newSlotDist) return alert("Fill out all slot fields!");
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
        alert(resData.detail || "Failed to append spot configuration"); 
      }
    } catch (err) { alert("Error connecting to server management terminal"); }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      
      {/* HEADER WITH ADMIN TOGGLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: '#1a73e8', margin: 0 }}>Smart City & Legal AI Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>Active Node Terminal Connected via Render Architecture</p>
        </div>
        <button 
          onClick={() => setShowAdmin(!showAdmin)} 
          style={{ padding: '12px 24px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
          {showAdmin ? "🔒 Close Control Center" : "⚙️ Open System Administration"}
        </button>
      </div>

      {/* --- ADMINISTRATIVE CONTROL SUITE --- */}
      {showAdmin && (
        <div style={{ backgroundColor: '#fff3cd', padding: '25px', borderRadius: '12px', border: '1px solid #ffeeba', marginBottom: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#856404', marginTop: 0, borderBottom: '2px solid #ffeeba', paddingBottom: '10px' }}>🛡️ Central Infrastructure Command Workspace</h2>
          
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '20px' }}>
            
            {/* Macro Form: Grid Reconfiguration */}
            <div style={{ flex: '1 1 300px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>📊 Macro Grid Dimensioning</h3>
              <p style={{ fontSize: '0.85em', color: '#666' }}>Wipe and dynamically set total density allocations instantly.</p>
              <form onSubmit={handleMacroReconfig}>
                <label style={{ fontWeight: '600', fontSize: '0.9em' }}>Total Target Slots:</label><br/>
                <input type="number" value={macroTotalSlots} onChange={(e) => setMacroTotalSlots(e.target.value)} style={{ width: '100%', padding: '8px', margin: '6px 0', borderRadius: '4px', border: '1px solid #ccc' }} /><br/>
                <label style={{ fontWeight: '600', fontSize: '0.9em' }}>Motorbike Allocation Size:</label><br/>
                <input type="number" value={macroMotorbikeCount} onChange={(e) => setMacroMotorbikeCount(e.target.value)} style={{ width: '100%', padding: '8px', margin: '6px 0', borderRadius: '4px', border: '1px solid #ccc' }} /><br/>
                <button type="submit" style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#d9381e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Reinitialize Core Array</button>
              </form>
            </div>

            {/* Micro Form: Individual Component Appends */}
            <div style={{ flex: '1 1 300px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>🛰️ Append Single Sensor Node</h3>
              <form onSubmit={handleAddSlot}>
                <label style={{ fontWeight: '600', fontSize: '0.9em' }}>Custom Slot ID:</label><br/>
                <input type="number" value={newSlotId} onChange={(e) => setNewSlotId(e.target.value)} style={{ width: '100%', padding: '6px', margin: '4px 0', borderRadius: '4px', border: '1px solid #ccc' }} /><br/>
                <label style={{ fontWeight: '600', fontSize: '0.9em' }}>Classification Designation:</label><br/>
                <select value={newSlotType} onChange={(e) => setNewSlotType(e.target.value)} style={{ width: '100%', padding: '6px', margin: '4px 0', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="Car">Standard Car Spot</option>
                  <option value="Motorbike">High-Density Motorbike Bay</option>
                  <option value="EV Charging">EV Fast Charging Bay</option>
                  <option value="Handicap">Accessible Parking Node</option>
                </select><br/>
                <label style={{ fontWeight: '600', fontSize: '0.9em' }}>Distance to Gate (Meters):</label><br/>
                <input type="number" value={newSlotDist} onChange={(e) => setNewSlotDist(e.target.value)} style={{ width: '100%', padding: '6px', margin: '4px 0', borderRadius: '4px', border: '1px solid #ccc' }} /><br/>
                <button type="submit" style={{ marginTop: '8px', width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Inject Node Profile</button>
              </form>
            </div>

            {/* Legal Form: Playbook Updates */}
            <div style={{ flex: '1 1 300px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>📜 Core Legal Governance Rules</h3>
              <form onSubmit={handlePlaybookUpdate}>
                <label style={{ fontWeight: '600', fontSize: '0.9em' }}>Max Notice Term Threshold:</label><br/>
                <input type="number" value={maxDays} onChange={(e) => setMaxDays(e.target.value)} style={{ width: '100%', padding: '6px', margin: '4px 0', borderRadius: '4px', border: '1px solid #ccc' }} /><br/>
                <label style={{ fontWeight: '600', fontSize: '0.9em' }}>Termination Template:</label><br/>
                <textarea value={termClause} onChange={(e) => setTermClause(e.target.value)} style={{ width: '100%', padding: '6px', margin: '4px 0', height: '45px', borderRadius: '4px', border: '1px solid #ccc' }} /><br/>
                <label style={{ fontWeight: '600', fontSize: '0.9em' }}>Liability Cap Paradigm:</label><br/>
                <textarea value={liabClause} onChange={(e) => setLiabClause(e.target.value)} style={{ width: '100%', padding: '6px', margin: '4px 0', height: '45px', borderRadius: '4px', border: '1px solid #ccc' }} /><br/>
                <button type="submit" style={{ width: '100%', padding: '10px', background: '#856404', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Push Legal Policy Sets</button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* --- STANDARD SMART PARKING GRID VIEW --- */}
      <section style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f0f2f5', paddingBottom: '10px' }}>
          <h2 style={{ margin: 0, color: '#222' }}>🚗 Multi-Modal Smart City Parking Grid Matrix</h2>
          <div style={{ display: 'flex', gap: '15px', fontSize: '0.85em', fontWeight: 'bold' }}>
            <span style={{ color: '#155724', background: '#d4edda', padding: '4px 8px', borderRadius: '4px' }}>🟢 Vacant</span>
            <span style={{ color: '#721c24', background: '#f8d7da', padding: '4px 8px', borderRadius: '4px' }}>🔴 Occupied</span>
            <span style={{ color: '#333', border: '1px dashed #333', padding: '4px 8px', borderRadius: '4px' }}>🏍️ Motorbike Border</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
          {Array.isArray(slots) && slots.length > 0 ? (
            slots.map(slot => {
              const isMotorbike = slot.type === 'Motorbike';
              return (
                <div key={slot.id} style={{
                  padding: '20px', 
                  borderRadius: '10px', 
                  border: isMotorbike ? '3px dashed #1a73e8' : '2px solid #444', 
                  textAlign: 'center',
                  backgroundColor: slot.status === 'vacant' ? '#eafaf1' : '#fdedec',
                  color: slot.status === 'vacant' ? '#196f3d' : '#943126',
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  minHeight: '160px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'transform 0.2s'
                }}>
                  <div>
                    <div style={{ fontSize: '2em', marginBottom: '5px' }}>
                      {isMotorbike ? '🏍️' : slot.type === 'EV Charging' ? '⚡' : slot.type === 'Handicap' ? '♿' : '🚗'}
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Slot {slot.id}</div>
                    <div style={{ fontSize: '0.85em', fontWeight: '600', color: '#555', textTransform: 'uppercase', margin: '3px 0' }}>{slot.type}</div>
                    <div style={{ fontSize: '0.8em', fontStyle: 'italic', color: '#666' }}>{slot.distance}m from terminal</div>
                  </div>
                  
                  {slot.status === 'vacant' ? (
                    <button 
                      onClick={() => handleBookSlot(slot.id)}
                      style={{
                        marginTop: '15px', padding: '8px 12px', background: '#196f3d', color: '#fff',
                        border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8em', fontWeight: 'bold', width: '100%'
                      }}>
                      Reserve Bay
                    </button>
                  ) : (
                    <div style={{ marginTop: '15px', padding: '6px', backgroundColor: 'rgba(148,49,38,0.1)', borderRadius: '4px', fontSize: '0.8em', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      🚫 Occupied
                    </div>
                  )}
                </div>
              );
            })
          ) : ( 
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4px', color: '#666' }}>
              <p style={{ fontWeight: 'bold', fontSize: '1.2em' }}>Awaiting active infrastructure stream telemetry...</p>
              <p style={{ fontSize: '0.9em' }}>Verify that your Render service is turned on and running correctly.</p>
            </div>
          )}
        </div>
      </section>

      {/* --- STANDARD LEGAL ASSISTANT UPLOAD SECTION --- */}
      <section style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h2 style={{ marginTop: 0, color: '#222', borderBottom: '2px solid #f0f2f5', paddingBottom: '10px' }}>⚖️ AI Commercial Contract Compliance Suite</h2>
        <p style={{ color: '#666', fontSize: '0.9em' }}>Upload parsing draft components here to evaluate terms against active administrator playbooks.</p>
        <div style={{ padding: '20px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center', background: '#fafafa', marginTop: '15px' }}>
          <input type="file" onChange={handleFileUpload} style={{ cursor: 'pointer' }} />
        </div>
        
        {loading && <p style={{ fontWeight: 'bold', color: '#1a73e8', textAlign: 'center', marginTop: '15px' }}>AI assessing logical compliance tokens and syntax patterns...</p>}
        
        {analysis && (
          <div style={{ marginTop: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '6px solid #1a73e8', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Analysis Report: <span style={{color: '#555'}}>{analysis.filename}</span></h3>
            <div style={{ display: 'inline-block', padding: '6px 12px', background: '#e3f2fd', color: '#0d47a1', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85em', marginBottom: '15px' }}>
              Risk Matrix Evaluation: {analysis.overall_risk}
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {analysis.analysis.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '15px', lineHeight: '1.5' }}>
                  <strong style={{fontSize: '1em', color: '#333'}}>{item.clause}:</strong> System flagged <code style={{background:'#e0e0e0', padding:'3px 6px', borderRadius:'3px', fontFamily:'monospace'}}>{item.found}</code>. <br/>
                  <span style={{color: '#1a73e8', fontWeight: '600'}}>Playbook Alignment Fix:</span> "{item.suggestion}"
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Analytics />
    </div>
  );
}

export default App;