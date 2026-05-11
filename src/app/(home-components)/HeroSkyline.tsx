import React from 'react';

// Architectural silhouette for the hero footer — Masjid Nabawi (Madinah) on
// the left, distant city rooftops in the middle, Masjid al-Haram + Abraj
// Al-Bait (Makkah) on the right. Lifted verbatim from the design system
// home.html; kept as a standalone component because the path data is large.
const HeroSkyline: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    aria-hidden
    className={`pointer-events-none absolute inset-x-0 bottom-0 leading-none ${className}`}
    style={{ opacity: 0.22, color: 'rgba(0, 0, 0, 0.6)' }}
  >
    <svg
      viewBox="0 0 1440 200"
      preserveAspectRatio="xMidYMax slice"
      className="block w-full h-auto"
    >
      <g fill="currentColor">
        {/* MADINAH — Masjid Nabawi */}
        <g>
          <rect x="118" y="42" width="6" height="158" />
          <ellipse cx="121" cy="40" rx="9" ry="7" />
          <rect x="119.5" y="22" width="3" height="16" />
          <path d="M118 22 L121 14 L124 22 Z" />
        </g>
        <g>
          <rect x="218" y="30" width="7" height="170" />
          <ellipse cx="221.5" cy="28" rx="10" ry="8" />
          <rect x="220" y="6" width="3" height="18" />
          <path d="M218 6 L221.5 -2 L225 6 Z" />
        </g>
        <g>
          <rect x="362" y="30" width="7" height="170" />
          <ellipse cx="365.5" cy="28" rx="10" ry="8" />
          <rect x="364" y="6" width="3" height="18" />
          <path d="M362 6 L365.5 -2 L369 6 Z" />
        </g>
        <g>
          <rect x="462" y="42" width="6" height="158" />
          <ellipse cx="465" cy="40" rx="9" ry="7" />
          <rect x="463.5" y="22" width="3" height="16" />
          <path d="M462 22 L465 14 L468 22 Z" />
        </g>

        <rect x="130" y="130" width="330" height="70" />
        <rect x="210" y="100" width="170" height="100" />
        <rect x="140" y="118" width="310" height="6" />

        <path d="M178 102 Q198 76 218 102 Z" />
        <path d="M372 102 Q392 76 412 102 Z" />

        {/* Green Dome */}
        <rect x="262" y="78" width="66" height="26" />
        <path d="M258 82 Q295 28 332 82 Z" />
        <rect x="292" y="50" width="6" height="20" />
        <ellipse cx="295" cy="48" rx="5" ry="4" />
        <path d="M292 42 L295 30 L298 42 Z" />

        {/* Transition city rooftops */}
        <rect x="498" y="168" width="42" height="32" />
        <rect x="542" y="158" width="32" height="42" />
        <rect x="576" y="172" width="56" height="28" />
        <rect x="635" y="160" width="38" height="40" />
        <rect x="676" y="170" width="58" height="30" />
        <rect x="738" y="155" width="32" height="45" />
        <rect x="773" y="168" width="24" height="32" />

        {/* MAKKAH — Masjid al-Haram + Abraj Al-Bait */}
        <g>
          <rect x="810" y="68" width="6" height="132" />
          <ellipse cx="813" cy="66" rx="9" ry="7" />
          <rect x="811.5" y="48" width="3" height="16" />
          <path d="M810 48 L813 40 L816 48 Z" />
        </g>
        <g>
          <rect x="878" y="54" width="6" height="146" />
          <ellipse cx="881" cy="52" rx="9" ry="7" />
          <rect x="879.5" y="32" width="3" height="18" />
          <path d="M878 32 L881 22 L884 32 Z" />
        </g>
        <g>
          <rect x="950" y="62" width="6" height="138" />
          <ellipse cx="953" cy="60" rx="9" ry="7" />
          <rect x="951.5" y="42" width="3" height="16" />
          <path d="M950 42 L953 34 L956 42 Z" />
        </g>
        <g>
          <rect x="1058" y="72" width="6" height="128" />
          <ellipse cx="1061" cy="70" rx="9" ry="7" />
          <rect x="1059.5" y="52" width="3" height="16" />
          <path d="M1058 52 L1061 44 L1064 52 Z" />
        </g>

        <rect x="815" y="140" width="260" height="60" />
        <rect x="815" y="128" width="260" height="8" />
        <rect x="890" y="112" width="110" height="22" />

        {/* The Kaaba */}
        <rect x="933" y="160" width="24" height="40" />

        {/* Zamzam tower complex */}
        <rect x="1090" y="82" width="38" height="118" />
        <rect x="1132" y="66" width="32" height="134" />
        <rect x="1300" y="66" width="32" height="134" />
        <rect x="1336" y="82" width="38" height="118" />

        {/* Abraj Al-Bait Clock Tower */}
        <rect x="1180" y="22" width="110" height="178" />
        <rect x="1170" y="38" width="130" height="12" />
        <rect x="1192" y="50" width="86" height="58" />
        <circle cx="1235" cy="79" r="19" fill="none" stroke="currentColor" strokeWidth={3} />
        <rect x="1226" y="14" width="18" height="12" />
        <rect x="1231" y="4" width="8" height="12" />
        <path
          d="M1235 4 L1235 -6 M1235 -4 A6 6 0 0 1 1244 -1"
          stroke="currentColor"
          strokeWidth={3}
          fill="none"
        />
      </g>
    </svg>
  </div>
);

export default HeroSkyline;
