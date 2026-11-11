export default function StigmaKeychainIllustration({
  className = 'stigma-keychain-art',
  titleId = 'keychain-title',
  description = 'Digital RESET keychain collectible with a heart and the words Break the Stigma',
}) {
  return <svg className={className} viewBox="0 0 240 300" role="img" aria-labelledby={titleId}>
    <title id={titleId}>{description}</title>
    <circle cx="120" cy="38" r="26" fill="#FFF0D9" stroke="#302F29" strokeWidth="5"/>
    <circle cx="120" cy="38" r="10" fill="none" stroke="#FF775E" strokeWidth="5"/>
    <path d="M120 64v27" stroke="#302F29" strokeWidth="7" strokeLinecap="round"/>
    <circle cx="120" cy="84" r="8" fill="#D9EF9B" stroke="#302F29" strokeWidth="4"/>
    <path d="M120 94 208 142v91l-88 48-88-48v-91l88-48Z" fill="#C8B8F5" stroke="#302F29" strokeWidth="5" strokeLinejoin="round"/>
    <path d="m120 110 70 39v76l-70 39-70-39v-76l70-39Z" fill="#FFF0D9" stroke="#302F29" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M120 133c-17-23-44-5-31 16 6 9 31 26 31 26s25-17 31-26c13-21-14-39-31-16Z" fill="#FF775E" stroke="#302F29" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M82 196h76" stroke="#302F29" strokeWidth="3" strokeLinecap="round"/>
    <text x="120" y="215" textAnchor="middle" fill="#302F29" fontFamily="Avenir Next, sans-serif" fontSize="13" fontWeight="900" letterSpacing="1.4">BREAK THE</text>
    <text x="120" y="234" textAnchor="middle" fill="#302F29" fontFamily="Avenir Next, sans-serif" fontSize="16" fontWeight="900" letterSpacing="1">STIGMA</text>
    <path d="m42 107 7-14m143 14-7-14M36 253l-9 10m177-10 9 10" stroke="#D9EF9B" strokeWidth="6" strokeLinecap="round"/>
  </svg>
}
