// Map tooltip for a tagged bird (Globe and Project maps): common name with the IUCN
// icon, the scientific name on its own smaller line, then the tag id with its links.
export const buildTagPopupHtml = ({
  species,
  commonName,
  scientificName,
  iucnIcon,
  iucnLabel,
  tagId,
  tagLink,
  projectLink,
}) => {
  const safeCommonName = commonName || species || "Unknown species";
  const iucnHtml = iucnIcon
    ? `<img src="${iucnIcon}" title="IUCN ${iucnLabel || ""}" alt="" aria-hidden="true" class="ml-1.5 inline-block h-3.5 w-3.5 align-[-2px] object-contain" />`
    : "";
  const sciHtml =
    scientificName && scientificName !== safeCommonName
      ? `<p class="text-xs italic leading-snug text-fg/60">${scientificName}</p>`
      : "";
  const projectHtml = projectLink ? `<a class="link" href="${projectLink}">View project</a>` : "";
  return `
    <div class="text-fg">
      <p class="text-sm font-semibold leading-snug">${safeCommonName}${iucnHtml}</p>
      ${sciHtml}
      <p class="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-fg/60">
        <span>Tag <span class="font-semibold text-fg/80">${tagId}</span></span>
        <a class="link" href="${tagLink}">View tag</a>
        ${projectHtml}
      </p>
    </div>
  `;
};
