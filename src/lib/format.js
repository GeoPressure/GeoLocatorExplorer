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

export const colorForIndex = (index, total) => {
  const hue = Math.round((index / Math.max(total, 1)) * 360);
  return `hsl(${hue}, 70%, 60%)`;
};
