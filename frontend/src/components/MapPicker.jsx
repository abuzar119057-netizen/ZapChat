import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import { ArrowLeft, Search, Target, Send, MapPin as MapPinIcon, Loader2, X } from 'lucide-react';

// Help component to sync map center with external state
const MapController = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

const MapPicker = ({ onSelect, onBack, initialLocation }) => {
    const [center, setCenter] = useState(initialLocation || { lat: 0, lng: 0 });
    const [address, setAddress] = useState('Fetching address...');
    const [loading, setLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debounceTimer = useRef(null);

    // Reverse Geocoding using Nominatim
    const fetchAddress = async (lat, lon) => {
        setLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
            const data = await res.json();
            if (data && data.display_name) {
                setAddress(data.display_name);
            } else {
                setAddress(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            }
        } catch (error) {
            setAddress(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        } finally {
            setLoading(false);
        }
    };

    // Handle map movement
    const MapEvents = () => {
        useMapEvents({
            moveend: (e) => {
                const newCenter = e.target.getCenter();
                setCenter(newCenter);
                
                // Debounce address fetching
                if (debounceTimer.current) clearTimeout(debounceTimer.current);
                debounceTimer.current = setTimeout(() => {
                    fetchAddress(newCenter.lat, newCenter.lng);
                }, 800);
            },
        });
        return null;
    };

    // Recenter to current location
    const recenterToLive = () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCenter(newPos);
            fetchAddress(newPos.lat, newPos.lng);
        });
    };

    useEffect(() => {
        if (!initialLocation) {
            recenterToLive();
        } else {
            fetchAddress(initialLocation.lat, initialLocation.lng);
        }
    }, [initialLocation]);

    // Simple search functionality
    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const newCenter = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                setCenter(newCenter);
                setAddress(data[0].display_name);
                setIsSearching(false);
            }
        } catch (error) {
            console.error("Search error", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 2000, display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease' }}>
            {/* Header */}
            <div style={{ background: '#007AFF', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <ArrowLeft size={24} onClick={onBack} style={{ cursor: 'pointer' }} />
                {!isSearching ? (
                    <>
                        <span style={{ fontSize: '18px', fontWeight: '700', flex: 1 }}>Choose on Map</span>
                        <Search size={22} onClick={() => setIsSearching(true)} style={{ cursor: 'pointer' }} />
                    </>
                ) : (
                    <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                            autoFocus
                            placeholder="Search for a place..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ flex: 1, border: 'none', outline: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '6px 12px', borderRadius: '18px', fontSize: '15px' }}
                        />
                        <X size={20} onClick={() => setIsSearching(false)} style={{ cursor: 'pointer' }} />
                    </form>
                )}
            </div>

            {/* Map Area */}
            <div style={{ flex: 1, position: 'relative' }}>
                <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <MapController center={center} />
                    <MapEvents />
                </MapContainer>

                {/* Center Pin Indicator (Visual only, doesn't move) */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)', zIndex: 1000, pointerEvents: 'none', marginTop: '-4px' }}>
                    <div style={{ filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.3))' }}>
                        <MapPinIcon size={44} color="#007AFF" fill="#007AFF" strokeWidth={1} />
                        {/* Avatar small overlay inside pin center? No, let's keep it simple as in reference image or just a classic pin */}
                    </div>
                </div>

                {/* Recenter Button */}
                <div 
                    onClick={recenterToLive}
                    style={{ position: 'absolute', bottom: '20px', right: '20px', width: '56px', height: '56px', background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 1000 }}
                >
                    <Target size={28} color="#007AFF" />
                </div>
            </div>

            {/* Selected Location Card */}
            <div style={{ padding: '24px 20px', background: '#fff', borderRadius: '24px 24px 0 0', marginTop: '-24px', position: 'relative', zIndex: 1001, boxShadow: '0 -4px 15px rgba(0,0,0,0.08)' }}>
                <div style={{ width: '40px', height: '4px', background: '#E5E5EA', borderRadius: '2px', margin: '-12px auto 20px' }}></div>
                
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#000', marginBottom: '8px' }}>Selected Location</h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', background: '#E3F2FD', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                             <MapPinIcon size={20} color="#007AFF" />
                        </div>
                        <div style={{ fontSize: '14px', color: '#667781', lineHeight: '1.4', minHeight: '40px' }}>
                            {loading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#007AFF' }}>
                                    <Loader2 size={14} className="animate-spin" /> Fetching address...
                                </div>
                            ) : address}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => onSelect(`${center.lat},${center.lng}|${address}`)}
                    style={{ width: '100%', padding: '16px', background: '#007AFF', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,122,255,0.3)', transition: 'transform 0.1s active' }}
                >
                    <Send size={20} fill="white" />
                    Send This Location
                </button>
            </div>
        </div>
    );
};

export default MapPicker;
