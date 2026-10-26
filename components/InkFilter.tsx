/** The #otm-ink roughening filter every stamp and seal uses (displacement + blotchy mask). Rendered once in the layout. */
export function InkFilter() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{ position: 'absolute' }}
      dangerouslySetInnerHTML={{
        __html:
          '<filter id="otm-ink" x="-10%" y="-10%" width="120%" height="120%">' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="grain"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="grain" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="rough"/>' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="11" result="blot"/>' +
          '<feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.1 0 0 0 1.95" result="m1"/>' +
          '<feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="2" result="speck"/>' +
          '<feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 0 0 0 2.6" result="m2"/>' +
          '<feComposite in="m1" in2="m2" operator="in" result="mask"/>' +
          '<feComposite in="rough" in2="mask" operator="in"/>' +
          '</filter>',
      }}
    />
  );
}
