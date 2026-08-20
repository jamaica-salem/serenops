export default function BrandLogo({
  className = "",
  alt = "SerenOps logo",
  showText = true,
  textClassName = "text-[#F3F7F5]",
}) {
  const imgSrc = "/serenops-icon.png";

  return (
    <div className={`inline-flex items-center space-x-0 ${className}`.trim()}>
      <img
        src={imgSrc}
        alt={alt}
        className="h-11 w-auto select-none"
        draggable="false"
        onError={(e) => {
          // fallback to existing svg if the icon file isn't present
          e.currentTarget.onerror = null;
          e.currentTarget.src = "/serenops-logo.svg";
        }}
      />
      {showText && (
        <span className={`font-display text-3xl font-semibold ${textClassName}`}>
          erenOps
        </span>
      )}
    </div>
  );
}
