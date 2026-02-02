import mapboxgl from "mapbox-gl";

export const createSidePopup = (mapInstance, lngLat, html, existingPopup) => {
  if (existingPopup) {
    existingPopup.remove();
  }
  const point = mapInstance.project(lngLat);
  const width = mapInstance.getContainer().clientWidth;
  const anchor = point.x > width / 2 ? "right" : "left";
  const offset = anchor === "right" ? [-12, 0] : [12, 0];
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    anchor,
    offset,
  });
  popup.setLngLat(lngLat).setHTML(html).addTo(mapInstance);
  return popup;
};
