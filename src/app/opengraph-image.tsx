import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Ranking Manager Trophy';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #ffffff, #f1f5f9)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            padding: '40px',
            borderRadius: '40px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          <svg
            width="300"
            height="300"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="5" y="6" width="4" height="7" rx="2" fill="#eab308" />
            <rect x="23" y="6" width="4" height="7" rx="2" fill="#eab308" />
            <path
              d="M9 4h14v5c0 4.418-3.582 8-8 8s-8-3.582-8-8V4z"
              fill="#eab308"
            />
            <rect x="14" y="18" width="4" height="4" rx="1" fill="#eab308" />
            <rect x="11" y="22" width="10" height="4" rx="1" fill="#eab308" />
            <rect x="9" y="26" width="14" height="3" rx="1" fill="#eab308" />
          </svg>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 84,
            fontWeight: 'bold',
            color: '#020817',
            display: 'flex',
          }}
        >
          Ranking Manager
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 32,
            color: '#64748b',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          visualizza e gestisci le classifiche generali dei tornei.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
