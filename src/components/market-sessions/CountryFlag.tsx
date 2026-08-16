import { memo } from "react";

type CountryFlagProps = {
  code: string;
  className?: string;
};

const UnionJack = ({ width = 36, height = 24 }: { width?: number; height?: number }) => (
  <g>
    <path fill="#012169" d={`M0 0h${width}v${height}H0z`} />
    <path d={`M0 0L${width} ${height}M${width} 0L0 ${height}`} stroke="#fff" strokeWidth="5" />
    <path d={`M0 0L${width} ${height}M${width} 0L0 ${height}`} stroke="#c8102e" strokeWidth="2" />
    <path fill="#fff" d={`M${width / 2 - 3} 0h6v${height}h-6zM0 ${height / 2 - 3}h${width}v6H0z`} />
    <path
      fill="#c8102e"
      d={`M${width / 2 - 1.8} 0h3.6v${height}h-3.6zM0 ${height / 2 - 1.8}h${width}v3.6H0z`}
    />
  </g>
);

function CountryFlagView({ code, className }: CountryFlagProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-country-flag={code}
      focusable="false"
      viewBox="0 0 36 24"
    >
      {code === "JP" && (
        <>
          <path fill="#fff" d="M0 0h36v24H0z" />
          <circle cx="18" cy="12" r="7.2" fill="#bc002d" />
        </>
      )}

      {code === "GB" && <UnionJack />}

      {code === "US" && (
        <>
          <path fill="#fff" d="M0 0h36v24H0z" />
          {[0, 4, 8, 12, 16, 20].map((y) => (
            <path key={y} fill="#b22234" d={`M0 ${y}h36v2H0z`} />
          ))}
          <path fill="#3c3b6e" d="M0 0h15v12H0z" />
          {[2, 5, 8, 11].flatMap((x) =>
            [2, 5, 8, 11].map((y) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="0.65" fill="#fff" />
            )),
          )}
        </>
      )}

      {code === "AU" && (
        <>
          <path fill="#012169" d="M0 0h36v24H0z" />
          <g transform="scale(.5)">
            <UnionJack />
          </g>
          <g fill="#fff">
            <circle cx="9" cy="17.5" r="2.1" />
            <circle cx="27" cy="5" r="1.25" />
            <circle cx="31" cy="10" r="1.25" />
            <circle cx="26" cy="14" r="1.25" />
            <circle cx="31" cy="19" r="1.25" />
            <circle cx="22" cy="9.5" r="0.8" />
          </g>
        </>
      )}
    </svg>
  );
}

export const CountryFlag = memo(CountryFlagView);
