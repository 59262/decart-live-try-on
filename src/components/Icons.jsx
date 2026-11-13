export function Icon({ name, size = 20 }) {
  const paths = {
    camera: <><path d="M14.5 6 13 4H7L5.5 6H3a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/><circle cx="10" cy="12.5" r="3.5"/></>,
    upload: <><path d="M10 14V2"/><path d="m5.5 6.5 4.5-4.5 4.5 4.5"/><path d="M3 12v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></>,
    image: <><rect x="2" y="3" width="16" height="14" rx="2"/><circle cx="7" cy="8" r="1.5"/><path d="m3 15 4.5-4.5 3 3 2-2 4.5 4.5"/></>,
    mirror: <><path d="M10 3v14"/><path d="m7 6-4 3v5l4 3z"/><path d="m13 6 4 3v5l-4 3z"/></>,
    phone: <><path d="M4.5 7.5c3.7 3.7 7.3 3.7 11 0"/><path d="M3.5 8.5 6 6l2.2 2.2"/><path d="M16.5 8.5 14 6l-2.2 2.2"/></>,
    info: <><circle cx="10" cy="10" r="8"/><path d="M10 9v5"/><path d="M10 6h.01"/></>,
    play: <path d="m7 4 9 6-9 6z"/>,
    check: <path d="m4 10 4 4 8-8"/>,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
