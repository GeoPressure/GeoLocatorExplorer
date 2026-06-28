import { listPrivateDatapackages } from "./privateDatapackageStore";

export const privateProjectKey = (project) => project.id || project.concept_id || project.title;

export const normalizeZenodoId = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const match =
    text.match(/zenodo\.(\d+)$/i) || text.match(/records\/(\d+)/i) || text.match(/^(\d+)$/);
  return match ? match[1] : "";
};

export const buildPrivateContext = (privateRecords, publicProjects = []) => {
  const publicProjectByRecordId = new Map(
    publicProjects
      .map((project) => [normalizeZenodoId(project.record_id), project])
      .filter(([key]) => Boolean(key)),
  );

  const entries = privateRecords.map((record) => {
    const privateProject = record.project || {};
    const recordIdKey = normalizeZenodoId(record.recordId || privateProject.record_id);
    const publicProject = publicProjectByRecordId.get(recordIdKey);
    const canonicalProjectId =
      publicProject?.id ||
      publicProject?.concept_id ||
      privateProject.concept_id ||
      privateProject.id;

    return {
      record,
      recordIdKey,
      canonicalProjectId,
      publicProject,
    };
  });

  return {
    entries,
    privateRecordIds: new Set(entries.map((entry) => entry.recordIdKey).filter(Boolean)),
    privateTagIds: new Set(
      entries.flatMap((entry) => (entry.record.tags || []).map((tag) => tag.tag_id).filter(Boolean)),
    ),
  };
};

export const loadPrivateContext = async (publicProjects = [], privateRecords = null) =>
  buildPrivateContext(privateRecords || (await listPrivateDatapackages()), publicProjects);
