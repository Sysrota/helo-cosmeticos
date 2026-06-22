import {
  useEffect,
} from "react";
import {
  useLocation,
} from "react-router-dom";

import {
  initClarity,
} from "../services/clarity";
import {
  initMetaPixel,
  trackMetaPageView,
} from "../services/metaPixel";

export default function AnalyticsTracker() {
  const location =
    useLocation();

  useEffect(() => {
    initMetaPixel();
    initClarity();
  }, []);

  useEffect(() => {
    trackMetaPageView();
  }, [
    location.pathname,
    location.search,
  ]);

  return null;
}
