export const projectSlug = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/zenodo\.(\d+)$/);
  return match ? match[1] : text;
};

export const sexSymbol = (value) => {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase();
  if (["m", "male"].includes(cleaned)) {
    return "♂";
  }
  if (["f", "female"].includes(cleaned)) {
    return "♀";
  }
  return "";
};

export const normalizeKeywords = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return value
      .split(/[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const formatShortDate = (value) => {
  if (!value) {
    return "";
  }
  const text = String(value);
  if (text.includes("T")) {
    return text.split("T")[0];
  }
  return text.length >= 10 ? text.slice(0, 10) : text;
};

const longDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const formatLongDate = (value) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return longDateFormatter.format(date);
};

// Distinct hue per index. Use theme "light" for a light background (deeper colors).
export const colorForIndex = (index, total, theme = "dark") => {
  const hue = Math.round((index / Math.max(total, 1)) * 360);
  return theme === "light" ? `hsl(${hue}, 75%, 40%)` : `hsl(${hue}, 70%, 60%)`;
};

// "Raphaël Nussbaumer" for a contributor: given and family names, or a "Family, Given"
// title turned around. An organisation name (no comma) is kept as is.
export const personDisplayName = (person) => {
  if (person?.givenName && person?.familyName) {
    return `${person.givenName} ${person.familyName}`;
  }
  const title = String(person?.title || "").trim();
  const match = title.match(/^([^,]+),\s*([^,]+)$/);
  return match ? `${match[2]} ${match[1]}` : title;
};

// Family name for short credits ("Wong et al."): the family name, the part of a
// "Family, Given" title before the comma, or the last word of "Given Family".
export const personFamilyName = (person) => {
  if (person?.familyName) {
    return person.familyName;
  }
  const title = String(person?.title || "").trim();
  return title.includes(",") ? title.split(",")[0].trim() : title.split(/\s+/).pop();
};
