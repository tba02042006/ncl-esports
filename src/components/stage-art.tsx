import { useId } from "react";

/** Original vector broadcast artwork. No third-party imagery or official venue implied. */
export function StageArt({ compact = false }: { compact?: boolean }) {
  const id = useId().replaceAll(":", "");
  return (
    <div className={`stage-art ${compact ? "compact" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 800 800" fill="none">
        <defs>
          <linearGradient
            id={`${id}-metal`}
            x1="170"
            y1="120"
            x2="630"
            y2="650"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#e1ff9f" />
            <stop offset=".38" stopColor="#c2ff45" />
            <stop offset=".65" stopColor="#618e16" />
            <stop offset="1" stopColor="#b4e94c" />
          </linearGradient>
          <linearGradient
            id={`${id}-shade`}
            x1="400"
            y1="0"
            x2="400"
            y2="800"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#c2ff45" stopOpacity=".18" />
            <stop offset="1" stopColor="#c2ff45" stopOpacity="0" />
          </linearGradient>
          <pattern
            id={`${id}-grid`}
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M40 0H0V40"
              stroke="#c2ff45"
              strokeOpacity=".12"
              strokeWidth=".5"
            />
          </pattern>
        </defs>
        <path d="M0 0H800V800H0Z" fill={`url(#${id}-grid)`} />
        <g className="arena-rings" stroke="#b6de70">
          <path
            d="M400 65 690 232V567L400 735 110 567V232Z"
            strokeOpacity=".28"
          />
          <path
            d="M400 100 660 250V550L400 700 140 550V250Z"
            strokeOpacity=".14"
          />
          <path
            d="M400 25 725 213V587L400 775 75 587V213Z"
            strokeOpacity=".1"
            strokeDasharray="3 9"
          />
          <path
            d="M110 232 690 567M690 232 110 567M400 65V735"
            strokeOpacity=".09"
          />
          <path d="M190 280H610V520H190Z" strokeOpacity=".16" />
          <path
            d="M400 280V520M190 340H250V460H190M610 340H550V460H610"
            strokeOpacity=".16"
          />
          <circle cx="400" cy="400" r="46" strokeOpacity=".13" />
        </g>
        <path
          d="M195 590 288 210H398L480 408 528 210H637L544 590H435L352 389 304 590Z"
          fill="#030604"
          stroke="#b2e34e"
          strokeOpacity=".15"
          strokeWidth="24"
          transform="translate(5 15)"
        />
        <path
          className="arena-monogram"
          d="M195 590 288 210H398L480 408 528 210H637L544 590H435L352 389 304 590Z"
          fill={`url(#${id}-metal)`}
        />
        <path
          d="M222 570 303 232H383L484 472 544 232H610"
          stroke="#f0ffd5"
          strokeOpacity=".55"
          strokeWidth="1.5"
        />
        <path
          d="M195 590 288 210H398L480 408 528 210H637L544 590H435L352 389 304 590Z"
          fill={`url(#${id}-shade)`}
        />
        <g stroke="#c2ff45" strokeWidth="2">
          <path d="M100 180V145H135M665 145H700V180M100 620V655H135M665 655H700V620" />
          <path
            d="M385 110H415M400 95V125M385 690H415M400 675V705"
            strokeWidth="1"
          />
        </g>
        <g fill="#9dab86" fontFamily="monospace" fontSize="9" letterSpacing="3">
          <text x="105" y="120">
            NCL / VISUAL SYSTEM
          </text>
          <text x="520" y="690">
            CS2 · UZBEKISTAN
          </text>
          <text x="110" y="715">
            NATIONAL CYBER LEAGUE
          </text>
        </g>
      </svg>
      <span className="art-coordinate">
        41.3111° N<br />
        69.2797° E
      </span>
    </div>
  );
}
