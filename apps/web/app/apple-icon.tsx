import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          borderRadius: 40,
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="7" y1="10" x2="7" y2="24" stroke="#fb7185" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="5.25" y="13" width="3.5" height="8" rx="0.6" fill="#e11d48" />
          <line x1="13" y1="8" x2="13" y2="22" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="11.25" y="10" width="3.5" height="7" rx="0.6" fill="#10b981" />
          <line x1="19" y1="6" x2="19" y2="20" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="17.25" y="8" width="3.5" height="8" rx="0.6" fill="#10b981" />
          <line x1="25" y1="4" x2="25" y2="18" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="23.25" y="6" width="3.5" height="7" rx="0.6" fill="#10b981" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
