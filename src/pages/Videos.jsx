import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SquarePlay } from 'lucide-react';
import './Videos.css';

const CHANNEL_URL = 'https://www.youtube.com/@astrodilip2487';
const UPLOADS_PLAYLIST_ID = 'UU8Hv-DG5FjLmBFDmBQ8Dxkg';
const AVATAR_URL = 'https://yt3.googleusercontent.com/ytc/AIdro_mY_8FZg4MoQdvcLnQUer1F9irz78VKRdimZWebWYOdng=s160-c-k-c0x00ffffff-no-rj';
const BANNER_URL = 'https://yt3.googleusercontent.com/Gu_8SaQWIMw6RB_1itLQh4lBzRlXSNPhUK0lOeQzOQcTg95PoHGyPhyVLlwGsV40oBEDjJTT=w2560-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj';

const Videos = () => (
  <div className="videos-page">
    <Helmet>
      <title>Videos | Astro Dilip Sharma on YouTube</title>
      <meta name="description" content="Watch Vedic astrology, numerology, and Vastu videos from Astro Dilip Sharma's YouTube channel." />
      <link rel="canonical" href="https://astrodilipsharma.com/videos" />
    </Helmet>

    <div className="videos-banner" style={{ backgroundImage: `url(${BANNER_URL})` }}>
      <div className="videos-banner-overlay">
        <img src={AVATAR_URL} alt="Astro Dilip" className="videos-avatar" />
        <div>
          <h1 className="videos-channel-name">Astro Dilip</h1>
          <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-primary videos-subscribe-btn">
            <SquarePlay size={20} /> Subscribe on YouTube
          </a>
        </div>
      </div>
    </div>

    <div className="container" style={{ padding: '3rem 2rem 5rem' }}>
      <h2 className="section-title">Latest Videos</h2>
      <p className="reports-subtitle">
        Vedic astrology insights, remedies, and predictions straight from the channel.
      </p>

      <div className="videos-player-wrapper glass-card">
        <iframe
          src={`https://www.youtube.com/embed/videoseries?list=${UPLOADS_PLAYLIST_ID}`}
          title="Astro Dilip Sharma videos"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  </div>
);

export default Videos;
