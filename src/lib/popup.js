export const buildTagPopupHtml = ({
  species,
  commonName,
  scientificName,
  iucnIcon,
  iucnLabel,
  tagId,
  tagLink,
  projectTitle,
  projectLink,
}) => {
  const safeCommonName = commonName || species || "Unknown species";
  const sciHtml = scientificName
    ? `<span class="ml-1 italic text-white/60">${scientificName}</span>`
    : "";
  const iucnHtml = iucnIcon
    ? `<img src="${iucnIcon}" title="IUCN ${iucnLabel || ""}" alt="" aria-hidden="true" class="ml-1 inline-block h-3.5 w-3.5 align-[-2px] object-contain" />`
    : "";
  const safeProjectTitle = projectTitle || "Untitled project";
  const projectHtml = projectLink
    ? `<a class="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/80 transition hover:border-white/30 hover:text-white" href="${projectLink}">View project</a>`
    : "";
  return `
    <div class="text-white">
      <p class="text-sm uppercase tracking-[0.18em] text-white/70">
        ${safeCommonName}${sciHtml}${iucnHtml}
        <span class="text-[10px] font-semibold">[${tagId}]</span>
      </p>
      <div class="mt-3 flex items-center justify-between gap-3">
        <a class="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/80 transition hover:border-white/30 hover:text-white" href="${tagLink}">
          View tag
        </a>
        ${projectHtml}
      </div>
    </div>
  `;
};
