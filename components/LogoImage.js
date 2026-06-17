import { useEffect, useState } from 'react';

const RAW_SRC = '';

export function useTransparentLogo(rawSrc = RAW_SRC) {
  const [ready, setReady] = useState(Boolean(rawSrc));

  useEffect(() => {
    setReady(Boolean(rawSrc));
    if (rawSrc) updateFavicon(rawSrc);
  }, [rawSrc]);

  return { src: rawSrc, ready };
}

export function updateFavicon(dataUrl) {
  if (typeof document === 'undefined' || !dataUrl) return;
  let link = document.querySelector('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = dataUrl;
}

export default function LogoImage({ src: srcProp = RAW_SRC, style = {}, className = '', alt = 'Logo', ...rest }) {
  const { src, ready } = useTransparentLogo(srcProp || RAW_SRC);
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{
        background: 'transparent',
        ...style,
        opacity: ready ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
      loading="eager"
      decoding="async"
      {...rest}
    />
  );
}
