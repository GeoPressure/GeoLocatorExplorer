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
  const sciHtml = scientificName
    ? `<span class="ml-1 italic text-fg/60">${scientificName}</span>`
    : "";
  const iucnHtml = iucnIcon
    ? `<img src="${iucnIcon}" title="IUCN ${iucnLabel || ""}" alt="" aria-hidden="true" class="ml-1 inline-block h-3.5 w-3.5 align-[-2px] object-contain" />`
    : "";
  const projectHtml = projectLink
    ? `<a class="button-ghost" href="${projectLink}">View project</a>`
    : "";
  return `
    <div class="text-fg">
      <p class="text-sm uppercase tracking-[0.2em] text-fg/70">
        ${safeCommonName}${sciHtml}${iucnHtml}
        <span class="text-[10px] font-semibold">[${tagId}]</span>
      </p>
      <div class="mt-3 flex items-center justify-between gap-3">
        <a class="button-ghost" href="${tagLink}">
          View tag
        </a>
        ${projectHtml}
      </div>
    </div>
  `;
};
