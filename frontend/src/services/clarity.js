const clarityProjectId =
  import.meta.env.VITE_CLARITY_PROJECT_ID;

let initialized = false;

function canUseClarity() {
  return typeof window !== "undefined" &&
    !!clarityProjectId;
}

export function initClarity() {
  if (
    !canUseClarity() ||
    initialized
  ) {
    return false;
  }

  /* eslint-disable */
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", clarityProjectId);
  /* eslint-enable */

  initialized = true;
  return true;
}

export function trackClarityEvent(eventName) {
  if (!canUseClarity()) return false;
  if (typeof window.clarity !== "function") return false;
  window.clarity("event", eventName);
  return true;
}
