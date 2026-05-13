import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimEngine } from './simulator/engine';

// Aircraft selection data for the menu
const AIRCRAFT_LIST = [
  {
    key: 'cessna172',
    name: 'Cessna 172 Skyhawk',
    category: 'General Aviation',
    description: 'Classic light aircraft. Ideal for learning. Forgiving handling and low stall speed.',
    specs: 'Max: 74 m/s • Mass: 757 kg • Engine: 1× Lycoming',
    color: '#4488ff',
    icon: '✈',
  },
  {
    key: 'cirrusVisionJet',
    name: 'Cirrus SF50 Vision Jet',
    category: 'Personal Jet',
    description: 'Single-engine personal jet with emergency parachute (CAPS). Press P to deploy.',
    specs: 'Max: 185 m/s • Mass: 1,800 kg • Engine: 1× Williams FJ33',
    color: '#ff4444',
    icon: '✈',
  },
  {
    key: 'gulfstreamG650',
    name: 'Gulfstream G650',
    category: 'Business Jet',
    description: 'Ultra-long range heavy bizjet. Twin Rolls-Royce BR725 engines. Mach 0.925.',
    specs: 'Max: 270 m/s • Mass: 22,000 kg • Engines: 2× RR BR725',
    color: '#2244aa',
    icon: '✈',
  },
  {
    key: 'b52',
    name: 'B-52 Stratofortress',
    category: 'Strategic Bomber',
    description: '8-engine cold war bomber. Mk-82 bombs and AGM-86 cruise missiles. Press B for bomb bay.',
    specs: 'Max: 280 m/s • Mass: 83,000 kg • Engines: 8× TF33',
    color: '#556633',
    icon: '💣',
  },
  {
    key: 'robinsonR44',
    name: 'Robinson R44 Raven',
    category: 'Helicopter',
    description: 'Light piston helicopter. W/S = collective. Arrows = cyclic. A/D = tail rotor yaw.',
    specs: 'Max: 55 m/s • Mass: 621 kg • Engine: 1× Lycoming',
    color: '#ff6600',
    icon: '🚁',
  },
  {
    key: 'f35',
    name: 'F-35B Lightning II',
    category: 'Supersonic Fighter',
    description: 'Supersonic stealth fighter. Shift+W = afterburner. V = VTOL. Missiles, gun & bombs.',
    specs: 'Max: 560 m/s • Mass: 13,290 kg • Engine: 1× F135',
    color: '#7788aa',
    icon: '⚡',
  },
  {
    key: 'ah64',
    name: 'AH-64D Apache',
    category: 'Attack Helicopter',
    description: 'Attack helicopter with 30mm chain gun, Hydra rockets & Hellfire missiles. T=lock, N=NVG.',
    specs: 'Max: 90 m/s • Mass: 5,165 kg • Engines: 2× GE T700',
    color: '#445533',
    icon: '🚁',
  },
];

// ── Main Menu ─────────────────────────────────────────────────────────────────
function MainMenu({ onStart }) {
  const [selected, setSelected] = useState('cessna172');
  const selectedAircraft = AIRCRAFT_LIST.find(a => a.key === selected);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(180deg, #0a0f1a 0%, #0d1a2a 60%, #1a0f0a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Courier New', monospace",
      color: '#aaccff',
      overflow: 'auto',
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          fontSize: 48, fontWeight: 'bold',
          color: '#ffffff',
          textShadow: '0 0 30px #4488ff, 0 0 60px #2266cc',
          letterSpacing: 6,
          marginBottom: 8,
        }}>
          FLIGHT SIMULATOR
        </div>
        <div style={{ fontSize: 14, color: '#668899', letterSpacing: 3 }}>
          FIRST-PERSON FLIGHT SIMULATION
        </div>
      </div>

      {/* Aircraft selection grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 200px)',
        gap: 12,
        marginBottom: 32,
      }}>
        {AIRCRAFT_LIST.map(aircraft => (
          <div
            key={aircraft.key}
            onClick={() => setSelected(aircraft.key)}
            style={{
              background: selected === aircraft.key
                ? `rgba(${hexToRgb(aircraft.color)}, 0.25)`
                : 'rgba(255,255,255,0.04)',
              border: `2px solid ${selected === aircraft.key ? aircraft.color : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              padding: '14px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>{aircraft.icon}</div>
            <div style={{ fontSize: 11, color: '#667788', marginBottom: 4, letterSpacing: 1 }}>
              {aircraft.category}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 'bold',
              color: selected === aircraft.key ? aircraft.color : '#aabbcc',
              lineHeight: 1.3,
            }}>
              {aircraft.name}
            </div>
            {selected === aircraft.key && (
              <div style={{
                position: 'absolute', top: 6, right: 8,
                width: 8, height: 8,
                borderRadius: '50%',
                background: aircraft.color,
                boxShadow: `0 0 8px ${aircraft.color}`,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Selected aircraft detail */}
      {selectedAircraft && (
        <div style={{
          width: 840, maxWidth: '90vw',
          background: `rgba(${hexToRgb(selectedAircraft.color)}, 0.1)`,
          border: `1px solid ${selectedAircraft.color}44`,
          borderRadius: 10,
          padding: '16px 24px',
          marginBottom: 28,
          display: 'flex', gap: 20, alignItems: 'flex-start',
        }}>
          <div style={{ fontSize: 48, lineHeight: 1 }}>{selectedAircraft.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: selectedAircraft.color, marginBottom: 6 }}>
              {selectedAircraft.name}
            </div>
            <div style={{ fontSize: 13, color: '#99aabb', marginBottom: 8, lineHeight: 1.6 }}>
              {selectedAircraft.description}
            </div>
            <div style={{ fontSize: 11, color: '#667788', letterSpacing: 1 }}>
              {selectedAircraft.specs}
            </div>
          </div>
        </div>
      )}

      {/* Start button */}
      <button
        onClick={() => onStart(selected)}
        style={{
          background: 'linear-gradient(135deg, #1a3a6a, #0d2040)',
          border: '2px solid #4488ff',
          color: '#88ccff',
          fontSize: 18,
          fontFamily: 'inherit',
          letterSpacing: 4,
          padding: '14px 60px',
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 0 20px rgba(68,136,255,0.3)',
        }}
        onMouseEnter={e => {
          e.target.style.background = 'linear-gradient(135deg, #2a5aaa, #1a3a80)';
          e.target.style.boxShadow = '0 0 40px rgba(68,136,255,0.6)';
        }}
        onMouseLeave={e => {
          e.target.style.background = 'linear-gradient(135deg, #1a3a6a, #0d2040)';
          e.target.style.boxShadow = '0 0 20px rgba(68,136,255,0.3)';
        }}
      >
        FLY NOW
      </button>

      {/* Controls hint */}
      <div style={{
        marginTop: 24, fontSize: 11,
        color: '#445566',
        textAlign: 'center',
        lineHeight: 1.9,
        letterSpacing: 1,
      }}>
        CONTROLS: WASD = Throttle/Rudder • ARROWS = Pitch/Roll • MOUSE (click canvas) = Fine control<br/>
        G = Gear • F/C = Flaps • Space = Fire • Tab = Weapon • T = Lock • V = View • 1-7 = Switch aircraft
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// ── Flight Simulator ─────────────────────────────────────────────────────────
export default function FlightSimulator() {
  const canvasRef = useRef(null);
  const hudRef = useRef(null);
  const engineRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState('cessna172');

  const handleStart = useCallback((aircraft) => {
    setSelectedAircraft(aircraft);
    setStarted(true);
  }, []);

  useEffect(() => {
    if (!started) return;
    if (!canvasRef.current || !hudRef.current) return;

    // Small delay to ensure canvas is rendered and sized
    const timer = setTimeout(() => {
      try {
        const engine = new SimEngine(canvasRef.current, hudRef.current, selectedAircraft);
        engineRef.current = engine;
        engine.start();
      } catch (err) {
        console.error('SimEngine failed to start:', err);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
    };
  }, [started, selectedAircraft]);

  if (!started) {
    return <MainMenu onStart={handleStart} />;
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      background: '#000',
      overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <div
        ref={hudRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      />

      {/* Return to menu */}
      <button
        onClick={() => {
          if (engineRef.current) {
            engineRef.current.stop();
            engineRef.current = null;
          }
          setStarted(false);
        }}
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#aaa',
          fontFamily: 'monospace',
          fontSize: 11,
          padding: '4px 10px',
          borderRadius: 4,
          cursor: 'pointer',
          zIndex: 100,
          pointerEvents: 'auto',
        }}
      >
        ◀ MENU
      </button>
    </div>
  );
}
