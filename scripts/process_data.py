#!/usr/bin/env python3
"""Process raw CSV inputs into optimized frontend assets.

Outputs:
- public/data/projects.json
- public/data/tags.json
- public/data/globe.json
- public/data/tags/<tag_id>.json
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import shutil
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Process GeoLocator raw CSV data.")
    parser.add_argument("--input", default="raw_data", help="Input directory with raw CSV files.")
    parser.add_argument("--output", default="public/data", help="Output directory for processed assets.")
    parser.add_argument(
        "--skip-pressurepaths",
        action="store_true",
        help="Skip pressurepaths processing.",
    )
    return parser.parse_args()


def parse_taxonomic(value: Optional[str]) -> List[str]:
    if value is None:
        return []
    text = str(value).strip().strip("\"")
    if not text:
        return []
    return [item.strip().strip("\"") for item in text.split(",") if item.strip().strip("\"")]


def to_float(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.upper() == "NA":
        return None
    return float(text)


def to_int(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.upper() == "NA":
        return None
    return int(float(text))


def parse_csv_contributors(value: str) -> List[Dict[str, Any]]:
    text = value.strip()
    if not text:
        return []
    if ";" in text:
        names = [item.strip() for item in text.split(";") if item.strip()]
        return [{"title": name} for name in names]
    parts = [item.strip() for item in text.split(",") if item.strip()]
    if not parts:
        return []
    if len(parts) == 1:
        return [{"title": parts[0]}]
    contributors: List[Dict[str, Any]] = []
    index = 0
    while index < len(parts):
        if index + 1 < len(parts):
            title = f"{parts[index]}, {parts[index + 1]}"
            index += 2
        else:
            title = parts[index]
            index += 1
        contributors.append({"title": title})
    return contributors


def parse_csv_licenses(value: str) -> List[Dict[str, Any]]:
    text = value.strip()
    if not text:
        return []
    items = [item.strip() for item in text.split(";") if item.strip()]
    licenses: List[Dict[str, Any]] = []
    for item in items:
        code = ""
        match = re.search(r"\(([^()]+)\)\s*$", item)
        if match:
            code = match.group(1).strip().lower()
        licenses.append({"title": item, "name": code or item, "path": ""})
    return licenses


def parse_csv_related_identifiers(value: str) -> List[Dict[str, Any]]:
    text = value.strip()
    if not text:
        return []
    items = [item.strip() for item in text.split(",") if item.strip()]
    related: List[Dict[str, Any]] = []
    for item in items:
        if ":" in item:
            relation_raw, identifier_raw = item.split(":", 1)
            relation_type = relation_raw.strip()
            identifier = identifier_raw.strip()
        else:
            relation_type = ""
            identifier = item
        if not identifier:
            continue
        identifier_type = "other"
        doi_match = re.match(r"^(?:https?://doi\.org/)?(10\.\S+)$", identifier, re.IGNORECASE)
        if doi_match:
            identifier = doi_match.group(1)
            identifier_type = "doi"
        elif re.match(r"^https?://", identifier, re.IGNORECASE):
            identifier_type = "url"
        related.append(
            {
                "relationType": relation_type,
                "relatedIdentifier": identifier,
                "relatedIdentifierType": identifier_type,
            }
        )
    return related


def parse_datapackages_csv(path: Path) -> List[Dict[str, Any]]:
    count_keys = [
        "tags",
        "measurements",
        "light",
        "pressure",
        "activity",
        "temperature_external",
        "temperature_internal",
        "magnetic",
        "wet_count",
        "conductivity",
        "paths",
        "pressurepaths",
    ]
    required_columns = {
        "datapackage_id",
        "title",
        "version",
        "created",
        "status",
        "access_status",
        "embargo",
        "conceptid",
        "codeRepository",
        "homepage",
        "contributors",
        "licenses",
        "keywords",
        "grants",
        "relatedIdentifiers",
        "temporal_start",
        "temporal_end",
        "taxonomic",
        "bibliographicCitation",
        *[f"numberTags_{key}" for key in count_keys],
    }
    rows: List[Dict[str, Any]] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        header = set(reader.fieldnames or [])
        missing_columns = sorted(required_columns - header)
        if missing_columns:
            raise SystemExit(
                f"Missing required columns in {path.name}: {', '.join(missing_columns)}"
            )
        for raw in reader:
            project_id = raw["datapackage_id"].strip()
            if not project_id:
                raise SystemExit("Missing datapackage_id in datapackages.csv.")
            concept_id = raw["conceptid"].strip()
            counts: Dict[str, Optional[int]] = {
                key: to_int(raw[f"numberTags_{key}"]) for key in count_keys
            }

            temporal_start = raw["temporal_start"].strip()
            temporal_end = raw["temporal_end"].strip()
            temporal = None
            if temporal_start or temporal_end:
                temporal = {"start": temporal_start, "end": temporal_end}

            record: Dict[str, Any] = {
                "id": project_id,
                "concept_id": concept_id,
                "title": raw["title"].strip(),
                "version": raw["version"].strip(),
                "created": raw["created"].strip(),
                "status": raw["status"].strip(),
                "access_status": raw["access_status"].strip(),
                "embargo": raw["embargo"].strip(),
                "repository": raw["codeRepository"].strip(),
                "homepage": raw["homepage"].strip(),
                "keywords": raw["keywords"].strip(),
                "grants": raw["grants"].strip(),
                "bibliographicCitation": raw["bibliographicCitation"].strip(),
                "taxonomic": parse_taxonomic(raw["taxonomic"]),
                "numberTags": counts,
                "contributors": parse_csv_contributors(raw["contributors"]),
                "licenses": parse_csv_licenses(raw["licenses"]),
                "relatedIdentifiers": parse_csv_related_identifiers(raw["relatedIdentifiers"]),
            }
            if temporal is not None:
                record["temporal"] = temporal
            rows.append(record)
    return rows


def load_datapackage_records(csv_path: Path) -> List[Dict[str, Any]]:
    if not csv_path.exists():
        raise SystemExit(f"Missing {csv_path}")
    rows = parse_datapackages_csv(csv_path)
    if not rows:
        raise SystemExit("datapackages.csv could not be parsed.")
    return rows


def round_decimal(value: Any, digits: int) -> Optional[float]:
    num = to_float(value)
    if num is None:
        return None
    return round(num, digits)


def round_coord(value: Any) -> Optional[float]:
    return round_decimal(value, 4)


def round_int(value: Any) -> Optional[int]:
    num = to_float(value)
    if num is None:
        return None
    return int(round(num))


def transform_rows(rows: Dict[str, List[Any]], transforms: Dict[str, Any]) -> Dict[str, List[Any]]:
    updated: Dict[str, List[Any]] = {}
    for key, values in rows.items():
        fn = transforms.get(key)
        if not fn:
            updated[key] = values
            continue
        updated[key] = [fn(value) for value in values]
    return updated


def parse_datetime(value: Optional[str]) -> Optional[dt.datetime]:
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    return dt.datetime.fromisoformat(text.replace("Z", "+00:00"))


def round_datetime_minute(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    parsed = parse_datetime(text)
    if not parsed:
        return value
    rounded = parsed.replace(second=0, microsecond=0)
    iso = rounded.isoformat()
    if iso.endswith("+00:00"):
        return iso.replace("+00:00", "Z")
    return iso


def compact_dump(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=True, separators=(",", ":"))


def reset_output_dir(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for subdir in ("projects", "tags"):
        path = output_dir / subdir
        if path.exists():
            shutil.rmtree(path)
    for filename in ("projects.json", "tags.json", "globe.json"):
        path = output_dir / filename
        if path.exists():
            path.unlink()


def load_resource_descriptors(datapackage_path: Path) -> Dict[str, Dict[str, Any]]:
    with datapackage_path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    resources = {}
    base_dir = datapackage_path.parent
    for resource in data["resources"]:
        name = resource["name"]
        fields = resource["schema"]["fields"]
        path_value = resource["path"]
        resources[name] = {
            "name": name,
            "path": str((base_dir / path_value).resolve()),
            "fields": fields,
        }
    return resources


def pandas_dtype_map(fields: List[Dict[str, Any]]) -> Dict[str, str]:
    dtype_map: Dict[str, str] = {}
    for field in fields:
        name = field.get("name")
        if not name:
            continue
        field_type = (field.get("type") or "string").lower()
        if field_type in ("date", "datetime"):
            dtype_map[name] = "string"
        elif field_type == "integer":
            dtype_map[name] = "Int64"
        elif field_type == "number":
            dtype_map[name] = "float64"
        elif field_type == "boolean":
            dtype_map[name] = "boolean"
        else:
            dtype_map[name] = "string"
    return dtype_map


def process_projects(
    records: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]], Dict[str, str]]:
    projects: List[Dict[str, Any]] = []
    ordered_projects: List[Dict[str, Any]] = []
    project_index: Dict[str, Dict[str, Any]] = {}
    record_to_project: Dict[str, str] = {}

    for row in records:
        taxonomic = [normalize_species(name) for name in row["taxonomic"]]
        counts = {key: to_int(value) for key, value in row["numberTags"].items()}

        record_id = row["id"].strip()
        concept_id = row["concept_id"].strip()
        if not record_id:
            title = row.get("title") or "unknown"
            raise SystemExit(f"Project missing id in datapackages.csv: {title}")

        concept_numeric = to_concept_id(concept_id) or to_concept_id(record_id)
        concept_doi = to_concept_doi(concept_numeric)
        project_id = concept_numeric or record_id

        project = dict(row)
        project["record_id"] = record_id
        if concept_numeric:
            project["concept_id"] = concept_numeric
        if concept_doi:
            project["concept_doi"] = concept_doi
        project["id"] = project_id
        project["taxonomic"] = taxonomic
        project["counts"] = counts
        project["relatedIdentifiers"] = [
            {**entry, "relationType": humanize_relation_type(entry.get("relationType", ""))}
            for entry in project.get("relatedIdentifiers", [])
        ]
        projects.append(project)

        if project_id in project_index:
            raise SystemExit(f"Duplicate project id in datapackages.csv: {project_id}")
        project_index[project_id] = project
        record_to_project[normalize_doi(record_id)] = project_id
        if concept_doi:
            record_to_project[normalize_doi(concept_doi)] = project_id
        if concept_numeric:
            record_to_project[concept_numeric] = project_id

    def is_embargoed(project: Dict[str, Any]) -> bool:
        embargo = project.get("embargo")
        if not embargo or str(embargo).strip().upper() == "NA":
            return False
        embargo_dt = dt.datetime.fromisoformat(str(embargo).replace("Z", "+00:00"))
        return embargo_dt.date() > dt.date.today()

    ordered_projects = sorted(
        projects,
        key=lambda item: (is_embargoed(item), item.get("title") or ""),
    )

    return ordered_projects, project_index, record_to_project


def humanize_relation_type(value: str) -> str:
    mapping = {
        "iscitedby": "Is cited by",
        "cites": "Cites",
        "issupplementto": "Is supplement to",
        "issupplementedby": "Is supplemented by",
        "iscontinuedby": "Is continued by",
        "continues": "Continues",
        "isnewversionof": "Is new version of",
        "ispreviousversionof": "Is previous version of",
        "ispartof": "Is part of",
        "haspart": "Has part",
        "ispublishedin": "Is published in",
        "isreferencedby": "Is referenced by",
        "references": "References",
        "isdocumentedby": "Is documented by",
        "documents": "Documents",
        "iscompiledby": "Is compiled by",
        "compiles": "Compiles",
        "isvariantformof": "Is variant form of",
        "isoriginalformof": "Is original form of",
        "isidenticalto": "Is identical to",
        "hasmetadata": "Has metadata",
        "ismetadatafor": "Is metadata for",
        "reviews": "Reviews",
        "isreviewedby": "Is reviewed by",
        "isderivedfrom": "Is derived from",
        "issourceof": "Is source of",
        "describes": "Describes",
        "isdescribedby": "Is described by",
        "hasversion": "Has version",
        "isversionof": "Is version of",
        "requires": "Requires",
        "isrequiredby": "Is required by",
        "obsoletes": "Obsoletes",
        "isobsoletedby": "Is obsoleted by",
        "collects": "Collects",
        "iscollectedby": "Is collected by",
        "hastranslation": "Has translation",
        "istranslationof": "Is translation of",
    }
    lowered = str(value or "").strip().lower()
    if lowered in mapping:
        return mapping[lowered]
    spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", str(value or "").strip())
    return spaced[:1].upper() + spaced[1:]


def normalize_species(name: str) -> str:
    cleaned = " ".join(name.strip().split())
    corrections = {
        "Caprimulgus europeaus": "Caprimulgus europaeus",
    }
    return corrections.get(cleaned, cleaned)


def normalize_doi(value: str) -> str:
    cleaned = (value or "").strip()
    if not cleaned:
        return ""
    lowered = cleaned.lower()
    if lowered.startswith("doi:"):
        lowered = lowered[4:].strip()
    if lowered.startswith("https://doi.org/"):
        lowered = lowered.replace("https://doi.org/", "")
    if lowered.startswith("http://doi.org/"):
        lowered = lowered.replace("http://doi.org/", "")
    return f"https://doi.org/{lowered}".rstrip("/")


def to_concept_id(value: str) -> str:
    if not value:
        return ""
    numeric = re.sub(r"[^0-9]", "", value)
    return numeric or ""


def to_concept_doi(concept_id: str) -> str:
    numeric = to_concept_id(concept_id)
    if not numeric:
        return ""
    return f"https://doi.org/10.5281/zenodo.{numeric}"


def build_taxa_objects(
    taxonomic: List[str],
    species_lookup: Dict[str, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    taxa: List[Dict[str, Any]] = []
    for name in taxonomic:
        scientific = normalize_species(name)
        species = species_lookup.get(scientific)
        if not species:
            raise SystemExit(f"Missing species mapping in species.csv for: {scientific}")
        taxa.append(
            {
                "scientific_name": species["scientific_name"],
                "common_name": species["common_name"],
                "species_code": species["species_code"],
                "in_ebirdst": species["in_ebirdst"],
                "birdlife_factsheet_url": species["birdlife_factsheet_url"],
                "birds_of_the_world_url": species["birds_of_the_world_url"],
            }
        )
    return taxa


def safe_project_id(value: str) -> str:
    text = str(value or "").strip()
    if text.isdigit():
        return text
    numeric = to_concept_id(text)
    if numeric:
        return numeric
    normalized = normalize_doi(text)
    match = re.search(r"zenodo\.(\d+)$", normalized)
    if match:
        return match.group(1)
    return re.sub(r"[^A-Za-z0-9_-]", "_", text)


def safe_tag_id(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]", "_", str(value or "").strip())


def parse_bool_string(value: str, field_name: str) -> bool:
    text = value.strip().upper()
    if text == "TRUE":
        return True
    if text == "FALSE":
        return False
    raise SystemExit(f"Invalid {field_name} value: {value}")


def parse_optional_url(value: str) -> str:
    text = value.strip()
    return "" if not text or text.upper() == "NA" else text


def load_species_lookup(csv_path: Path) -> Dict[str, Dict[str, Any]]:
    required_columns = [
        "scientific_name_input",
        "Scientific_name",
        "English_name_AviList",
        "Species_code_Cornell_Lab",
        "Birds_of_the_World_URL",
        "BirdLife_DataZone_URL",
        "in_ebirdst",
    ]
    lookup: Dict[str, Dict[str, Any]] = {}
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        header = reader.fieldnames or []
        missing = [col for col in required_columns if col not in header]
        if missing:
            raise SystemExit(
                f"Missing required columns in {csv_path.name}: {', '.join(missing)}"
            )
        for row in reader:
            scientific_input = normalize_species(row["scientific_name_input"])
            scientific_name = normalize_species(row["Scientific_name"])
            entry = {
                "scientific_name": scientific_name,
                "common_name": row["English_name_AviList"].strip(),
                "species_code": row["Species_code_Cornell_Lab"].strip(),
                "birds_of_the_world_url": parse_optional_url(row["Birds_of_the_World_URL"]),
                "birdlife_factsheet_url": parse_optional_url(row["BirdLife_DataZone_URL"]),
                "in_ebirdst": parse_bool_string(row["in_ebirdst"], "in_ebirdst"),
            }
            for key in {scientific_input, scientific_name}:
                existing = lookup.get(key)
                if existing and existing != entry:
                    raise SystemExit(f"Conflicting species mapping for: {key}")
                lookup[key] = entry

    if not lookup:
        raise SystemExit("species.csv could not be parsed.")
    return lookup


def process_observations(
    observations_path: Path,
) -> Tuple[
    Dict[str, Dict[str, Optional[Any]]],
    Dict[str, Dict[str, List[Dict[str, Any]]]],
    Dict[str, List[Dict[str, Any]]],
]:
    tag_stats: Dict[str, Dict[str, Optional[Any]]] = {}
    tag_locations: Dict[str, Dict[str, List[Dict[str, Any]]]] = defaultdict(
        lambda: {"equipment": [], "retrieval": []}
    )
    tag_observations: Dict[str, List[Dict[str, Any]]] = {}
    obs_by_tag: Dict[str, List[Tuple[dt.datetime, Dict[str, Any]]]] = defaultdict(list)
    age_class_map = {
        "1": "Pullus",
        "2": "Full-grown",
        "3": "1yr",
        "4": ">1yr",
        "5": "2yr",
        "6": ">2yr",
    }
    age_class_values = set(age_class_map.values())

    with observations_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            tag_id = (row.get("tag_id") or "").strip()
            if not tag_id:
                continue
            stamp = parse_datetime(row.get("datetime"))
            if stamp is None:
                continue
            obs_by_tag[tag_id].append((stamp, row))

            obs_type = (row.get("observation_type") or "").strip().lower()
            if obs_type in {"equipment", "retrieval"}:
                lat = to_float(row.get("latitude"))
                lon = to_float(row.get("longitude"))
                location_name = (row.get("location_name") or "").strip()
                if lat is not None and lon is not None:
                    tag_locations[tag_id][obs_type].append(
                        {
                            "latitude": round(lat, 6),
                            "longitude": round(lon, 6),
                            "location_name": location_name,
                        }
                    )

    for tag_id, entries in obs_by_tag.items():
        entries.sort(key=lambda item: item[0])
        sex = None
        age_class = None
        wing_length = None
        obs_entries: List[Dict[str, Any]] = []
        for _, row in entries:
            if sex is None:
                value = (row.get("sex") or "").strip()
                if value and value.upper() != "U":
                    sex = value
            if age_class is None:
                value = (row.get("age_class") or "").strip()
                if value and value.upper() != "U" and value not in {"0", "0.0"}:
                    mapped = age_class_map.get(value)
                    if mapped:
                        age_class = mapped
                    elif value in age_class_values:
                        age_class = value
            if wing_length is None:
                value = to_float(row.get("wing_length"))
                if value is not None and value > 0:
                    wing_length = round(value, 2)
            if sex is not None and age_class is not None and wing_length is not None:
                break
        for stamp, row in entries:
            raw_age = (row.get("age_class") or "").strip()
            mapped_age = age_class_map.get(raw_age) if raw_age else ""
            if not mapped_age and raw_age in age_class_values:
                mapped_age = raw_age
            obs_entries.append(
                {
                    "datetime": stamp.isoformat(),
                    "observation_type": (row.get("observation_type") or "").strip() or None,
                    "latitude": to_float(row.get("latitude")),
                    "longitude": to_float(row.get("longitude")),
                    "location_name": (row.get("location_name") or "").strip() or None,
                    "sex": (row.get("sex") or "").strip() or None,
                    "age_class": mapped_age or raw_age or None,
                    "wing_length": to_float(row.get("wing_length")),
                }
            )
        tag_stats[tag_id] = {
            "sex": sex,
            "age_class": age_class,
            "wing_length": wing_length,
        }
        tag_observations[tag_id] = obs_entries

    return tag_stats, tag_locations, tag_observations


def process_project_assets(
    output_dir: Path,
    paths_path: Path,
    staps_path: Path,
    tag_to_project: Dict[str, str],
    tag_meta_map: Dict[str, Dict[str, Any]],
    project_known_locations: Dict[str, List[Dict[str, Any]]],
) -> set:
    stap_stats: Dict[Tuple[str, str], List[float]] = defaultdict(lambda: [0.0, 0.0, 0.0])

    with paths_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            tag_id = (row.get("tag_id") or "").strip()
            if not tag_id:
                continue
            if (row.get("type") or "").strip().lower() != "most_likely":
                continue
            lon = to_float(row.get("lon"))
            lat = to_float(row.get("lat"))
            stap_id = (row.get("stap_id") or "").strip()
            if lon is None or lat is None:
                continue
            if stap_id:
                stats = stap_stats[(tag_id, stap_id)]
                stats[0] += lon
                stats[1] += lat
                stats[2] += 1

    project_staps: Dict[str, Dict[str, List[Dict[str, Any]]]] = defaultdict(
        lambda: defaultdict(list)
    )
    with staps_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            tag_id = (row.get("tag_id") or "").strip()
            if not tag_id:
                continue
            stap_id = (row.get("stap_id") or "").strip()
            start_dt = parse_datetime(row.get("start"))
            end_dt = parse_datetime(row.get("end"))
            lon = to_float(row.get("known_lon"))
            lat = to_float(row.get("known_lat"))
            stats = stap_stats.get((tag_id, stap_id))
            if stats and stats[2] > 0:
                lon = stats[0] / stats[2]
                lat = stats[1] / stats[2]
            if start_dt is None or end_dt is None or lon is None or lat is None:
                continue
            duration = (end_dt - start_dt).total_seconds() / 86400.0
            project_id = tag_to_project.get(tag_id)
            if project_id:
                project_staps[project_id][tag_id].append(
                    {
                        "stap_id": stap_id,
                        "longitude": round(lon, 5),
                        "latitude": round(lat, 5),
                        "duration_days": round(max(duration, 0.0), 2),
                        "start": start_dt.isoformat(),
                        "end": end_dt.isoformat(),
                    }
                )

    projects_dir = output_dir / "projects"
    projects_dir.mkdir(parents=True, exist_ok=True)
    project_tags: Dict[str, set] = defaultdict(set)
    for tag_id, project_id in tag_to_project.items():
        if project_id:
            project_tags[project_id].add(tag_id)

    project_ids_with_data = set(project_staps.keys())
    for project_id in project_ids_with_data:
        tag_ids = sorted(project_tags.get(project_id, set()))
        tags_payload = []
        for tag_id in tag_ids:
            meta = tag_meta_map.get(tag_id, {})
            staps = project_staps.get(project_id, {}).get(tag_id, [])
            staps_sorted = sorted(staps, key=lambda item: item.get("start") or "")
            tag_entry = {
                "tag_id": tag_id,
                "scientific_name": meta.get("scientific_name"),
                "common_name": meta.get("common_name"),
                "species_code": meta.get("species_code"),
                "birdlife_factsheet_url": meta.get("birdlife_factsheet_url"),
                "birds_of_the_world_url": meta.get("birds_of_the_world_url"),
                "in_ebirdst": meta.get("in_ebirdst"),
                "sex": meta.get("sex"),
                "age_class": meta.get("age_class"),
                "wing_length": meta.get("wing_length"),
                "staps": staps_sorted,
            }
            tags_payload.append(tag_entry)

        payload = {
            "tags": tags_payload,
            "known_locations": project_known_locations.get(project_id, []),
        }
        compact_dump(projects_dir / f"{safe_project_id(project_id)}.json", payload)
    return project_ids_with_data


def resolve_project_id(
    raw_project_id: str,
    project_index: Dict[str, Dict[str, Any]],
    record_to_project: Dict[str, str],
) -> str:
    if not raw_project_id:
        return ""
    concept_candidate = to_concept_id(raw_project_id)
    if concept_candidate and concept_candidate in project_index:
        return concept_candidate
    normalized_project_id = normalize_doi(raw_project_id)
    if normalized_project_id in record_to_project:
        return record_to_project[normalized_project_id]
    if raw_project_id in record_to_project:
        return record_to_project[raw_project_id]
    return concept_candidate or raw_project_id


def process_tags(
    tags_path: Path,
    project_index: Dict[str, Dict[str, Any]],
    record_to_project: Dict[str, str],
    species_lookup: Dict[str, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    tags: List[Dict[str, Any]] = []
    missing_species: List[str] = []
    missing_project_tags: List[str] = []
    unknown_project_ids: List[str] = []
    seen_tags: set = set()

    with tags_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            tag_id = (row.get("tag_id") or "").strip()
            if not tag_id:
                raise SystemExit("Missing tag_id in tags.csv.")
            if tag_id in seen_tags:
                raise SystemExit(f"Duplicate tag_id in tags.csv: {tag_id}")
            seen_tags.add(tag_id)
            scientific_name = normalize_species(row.get("scientific_name") or "")
            raw_project_id = (row.get("datapackage_id") or "").strip()
            project_id = resolve_project_id(raw_project_id, project_index, record_to_project)
            if not raw_project_id:
                missing_project_tags.append(tag_id or "unknown")
            elif project_id not in project_index:
                unknown_project_ids.append(raw_project_id)
            species = species_lookup.get(scientific_name)
            if scientific_name and not species:
                missing_species.append(scientific_name)

            tags.append(
                {
                    "tag_id": tag_id,
                    "ring_number": row.get("ring_number"),
                    "scientific_name": species.get("scientific_name") if species else scientific_name,
                    "common_name": species.get("common_name") if species else None,
                    "species_code": species.get("species_code") if species else None,
                    "birdlife_factsheet_url": species.get("birdlife_factsheet_url") if species else "",
                    "birds_of_the_world_url": species.get("birds_of_the_world_url") if species else "",
                    "in_ebirdst": species.get("in_ebirdst") if species else None,
                    "manufacturer": row.get("manufacturer"),
                    "model": row.get("model"),
                    "firmware": row.get("firmware"),
                    "weight": row.get("weight"),
                    "attachment_type": row.get("attachment_type"),
                    "readout_method": row.get("readout_method"),
                    "tag_comments": row.get("tag_comments"),
                    "project_id": project_id,
                }
            )

    if missing_species:
        missing_sorted = sorted(set(missing_species))
        preview = ", ".join(missing_sorted[:15])
        raise SystemExit(
            f"Missing species mapping in species.csv for {len(missing_sorted)} species: {preview}"
        )

    if missing_project_tags:
        missing_sorted = sorted(set(missing_project_tags))
        preview = ", ".join(missing_sorted[:10])
        raise SystemExit(
            f"Missing datapackage_id for {len(missing_sorted)} tags: {preview}"
        )

    if unknown_project_ids:
        unknown_sorted = sorted(set(unknown_project_ids))
        preview = ", ".join(unknown_sorted[:10])
        raise SystemExit(
            f"Unknown datapackage_id values for {len(unknown_sorted)} tags: {preview}"
        )

    return tags


def load_staps(
    staps_path: Path,
) -> Tuple[
    Dict[Tuple[str, str], Tuple[Optional[dt.datetime], Optional[dt.datetime]]],
    Dict[str, Tuple[Optional[dt.datetime], Optional[dt.datetime]]],
]:
    staps_index: Dict[Tuple[str, str], Tuple[Optional[dt.datetime], Optional[dt.datetime]]] = {}
    tag_ranges: Dict[str, Tuple[Optional[dt.datetime], Optional[dt.datetime]]] = {}
    with staps_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            tag_id = (row.get("tag_id") or "").strip()
            stap_id = (row.get("stap_id") or "").strip()
            if not tag_id or not stap_id:
                continue
            start_dt = parse_datetime(row.get("start"))
            end_dt = parse_datetime(row.get("end"))
            if start_dt is None or end_dt is None:
                continue
            staps_index[(tag_id, stap_id)] = (start_dt, end_dt)
            current_start, current_end = tag_ranges.get(tag_id, (None, None))
            if current_start is None or start_dt < current_start:
                current_start = start_dt
            if current_end is None or end_dt > current_end:
                current_end = end_dt
            tag_ranges[tag_id] = (current_start, current_end)
    return staps_index, tag_ranges


def process_paths(
    paths_path: Path,
    staps_path: Path,
    tag_meta_map: Dict[str, Dict[str, Any]],
    tag_to_project: Dict[str, Optional[str]],
    project_title_map: Dict[str, str],
) -> Dict[str, Any]:
    staps_index, tag_ranges = load_staps(staps_path)
    stap_accum: Dict[Tuple[str, str], List[float]] = defaultdict(lambda: [0.0, 0.0, 0.0])

    with paths_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            tag_id = (row.get("tag_id") or "").strip()
            if not tag_id:
                continue
            if (row.get("type") or "").strip().lower() != "most_likely":
                continue
            lon = to_float(row.get("lon"))
            lat = to_float(row.get("lat"))
            stap_id = (row.get("stap_id") or "").strip()
            if lon is None or lat is None or not stap_id:
                continue
            bucket = stap_accum[(tag_id, stap_id)]
            bucket[0] += lon
            bucket[1] += lat
            bucket[2] += 1

    tag_segments: Dict[str, List[Tuple[dt.datetime, dt.datetime, float, float]]] = defaultdict(list)
    for (tag_id, stap_id), (sum_lon, sum_lat, count) in stap_accum.items():
        if count == 0:
            continue
        start_dt, end_dt = staps_index.get((tag_id, stap_id), (None, None))
        if start_dt is None or end_dt is None or end_dt < start_dt:
            continue
        lon = round(sum_lon / count, 5)
        lat = round(sum_lat / count, 5)
        tag_segments[tag_id].append((start_dt, end_dt, lon, lat))

    tags: List[Dict[str, Any]] = []

    for tag_id, segments in tag_segments.items():
        range_start, range_end = tag_ranges.get(tag_id, (None, None))
        if range_start is None or range_end is None:
            continue
        max_end = range_start + dt.timedelta(days=365)
        display_end = min(range_end, max_end)
        if display_end <= range_start:
            continue

        segments.sort(key=lambda item: item[0])
        positions: List[Optional[List[float]]] = [None] * 365
        has_positions = False

        segment_index = 0
        for offset in range(365):
            date = range_start.date() + dt.timedelta(days=offset)
            sample_time = dt.datetime(
                date.year,
                date.month,
                date.day,
                12,
                0,
                0,
                tzinfo=range_start.tzinfo,
            )
            if sample_time < range_start or sample_time > display_end:
                continue
            while segment_index < len(segments) and segments[segment_index][1] < sample_time:
                segment_index += 1
            if segment_index >= len(segments):
                break
            seg_start, seg_end, lon, lat = segments[segment_index]
            if not (seg_start <= sample_time <= seg_end):
                continue

            day_index = sample_time.timetuple().tm_yday
            day_index = min(day_index, 365)
            coord = [lon, lat]
            positions[day_index - 1] = coord
            has_positions = True

        if not has_positions:
            continue

        meta = tag_meta_map.get(tag_id, {})
        project_id = tag_to_project.get(tag_id)
        tags.append(
            {
                "tag_id": tag_id,
                "scientific_name": meta.get("scientific_name"),
                "common_name": meta.get("common_name"),
                "species_code": meta.get("species_code"),
                "birdlife_factsheet_url": meta.get("birdlife_factsheet_url"),
                "birds_of_the_world_url": meta.get("birds_of_the_world_url"),
                "in_ebirdst": meta.get("in_ebirdst"),
                "project_id": project_id,
                "project_title": project_title_map.get(project_id) if project_id else None,
                "sex": meta.get("sex"),
                "age_class": meta.get("age_class"),
                "wing_length": meta.get("wing_length"),
                "positions": positions,
            }
        )

    return tags


def load_raw_table_by_tag(
    resource_descriptor: Dict[str, Any],
    tag_key: str = "tag_id",
    allowed_tags: Optional[set] = None,
    chunksize: int = 200_000,
    allowed_columns: Optional[List[str]] = None,
    max_simulation_j: Optional[int] = None,
) -> Tuple[List[str], Dict[str, Dict[str, List[Any]]]]:
    path = resource_descriptor["path"]
    fields = resource_descriptor["fields"]
    resource_columns = [field.get("name") for field in fields if field.get("name")]
    if allowed_columns:
        allowed_set = {col for col in allowed_columns if col}
        columns = [col for col in resource_columns if col in allowed_set]
    else:
        columns = resource_columns
    read_columns = list(columns)
    if tag_key not in read_columns:
        read_columns.append(tag_key)
    if max_simulation_j is not None and "j" in resource_columns and "j" not in read_columns:
        read_columns.append("j")
    dtype_map = pandas_dtype_map(fields)
    rows_by_tag: Dict[str, Dict[str, List[Any]]] = {}

    reader = pd.read_csv(
        path,
        usecols=read_columns or None,
        dtype=dtype_map or None,
        chunksize=chunksize,
        keep_default_na=True,
        na_values=["", "NA", "NaN", "nan", "null", "NULL"],
        true_values=["true", "True", "1"],
        false_values=["false", "False", "0"],
    )

    for chunk in reader:
        if max_simulation_j is not None and "j" in chunk.columns:
            j_values = pd.to_numeric(chunk["j"], errors="coerce")
            chunk = chunk[j_values.isna() | (j_values <= max_simulation_j)]
            if chunk.empty:
                continue
        if allowed_tags is not None:
            chunk = chunk[chunk[tag_key].isin(allowed_tags)]
        if chunk.empty:
            continue
        for tag_id, group in chunk.groupby(tag_key, sort=False):
            if pd.isna(tag_id):
                continue
            tag_id = str(tag_id).strip()
            if not tag_id:
                continue
            bucket = rows_by_tag.get(tag_id)
            if bucket is None:
                bucket = {col: [] for col in columns}
                rows_by_tag[tag_id] = bucket
            for col in columns:
                values = group[col].tolist()
                bucket[col].extend([None if pd.isna(v) else v for v in values])

    return columns, rows_by_tag


def process_tag_assets(
    output_dir: Path,
    tags: List[Dict[str, Any]],
    tag_observations: Dict[str, List[Dict[str, Any]]],
    paths_columns: List[str],
    paths_rows_by_tag: Dict[str, Dict[str, List[Any]]],
    edges_columns: List[str],
    edges_rows_by_tag: Dict[str, Dict[str, List[Any]]],
    staps_columns: List[str],
    staps_rows_by_tag: Dict[str, Dict[str, List[Any]]],
    pressure_columns: List[str],
    pressure_rows_by_tag: Dict[str, Dict[str, List[Any]]],
) -> None:
    tags_dir = output_dir / "tags"
    tags_dir.mkdir(parents=True, exist_ok=True)

    for tag in tags:
        tag_id = tag.get("tag_id")
        if not tag_id:
            continue
        payload = dict(tag)
        payload.pop("title", None)
        payload.pop("concept_id", None)
        payload.pop("concept_doi", None)
        payload.pop("doi", None)
        paths_rows = paths_rows_by_tag.get(tag_id, {}) if paths_columns else {}
        if paths_rows:
            paths_rows = transform_rows(
                paths_rows,
                {
                    "stap_id": to_int,
                    "lat": round_coord,
                    "lon": round_coord,
                },
            )

        staps_rows = staps_rows_by_tag.get(tag_id, {}) if staps_columns else {}
        if staps_rows:
            staps_rows = transform_rows(staps_rows, {"stap_id": to_int})
            staps_rows = transform_rows(
                staps_rows,
                {
                    "start": round_datetime_minute,
                    "end": round_datetime_minute,
                },
            )

        pressure_rows = pressure_rows_by_tag.get(tag_id, {}) if pressure_columns else {}
        if pressure_rows:
            pressure_rows = transform_rows(
                pressure_rows,
                {
                    "stap_id": lambda v: round_decimal(v, 3),
                    "lat": round_coord,
                    "lon": round_coord,
                    "altitude": round_int,
                    "pressure": lambda v: round_decimal(v, 1),
                    "pressure_norm": lambda v: round_decimal(v, 1),
                    "datetime": round_datetime_minute,
                },
            )
            if "datetime" in pressure_rows:
                pressure_rows["datetime"] = [
                    round_datetime_minute(value) for value in pressure_rows["datetime"]
                ]
            if "t" in pressure_rows:
                pressure_rows["t"] = [round_datetime_minute(value) for value in pressure_rows["t"]]

        payload.update(
            {
                "paths": paths_rows if paths_columns else {},
                "staps": staps_rows if staps_columns else {},
                "observations": tag_observations.get(tag_id, []),
                "pressurepath": pressure_rows if pressure_columns else {},
            }
        )
        compact_dump(tags_dir / f"{safe_tag_id(tag_id)}.json", payload)


def main() -> None:
    args = parse_args()
    input_dir = Path(args.input)
    output_dir = Path(args.output)
    print(f"[process] input={input_dir} output={output_dir}")

    datapackage_csv_path = input_dir / "datapackages.csv"
    datapackage_resource_path = input_dir / "datapackage.json"
    species_path = input_dir / "species.csv"
    tags_path = input_dir / "tags.csv"
    paths_path = input_dir / "paths.csv"
    edges_path = input_dir / "edges.csv"
    staps_path = input_dir / "staps.csv"
    observations_path = input_dir / "observations.csv"
    pressure_path = input_dir / "pressurepaths.csv"

    if not datapackage_csv_path.exists():
        raise SystemExit(f"Missing {datapackage_csv_path}")
    if not datapackage_resource_path.exists():
        raise SystemExit(f"Missing {datapackage_resource_path}")
    if not species_path.exists():
        raise SystemExit(f"Missing {species_path}")
    if not tags_path.exists():
        raise SystemExit(f"Missing {tags_path}")
    if not paths_path.exists():
        raise SystemExit(f"Missing {paths_path}")
    if not edges_path.exists():
        raise SystemExit(f"Missing {edges_path}")
    if not staps_path.exists():
        raise SystemExit(f"Missing {staps_path}")
    if not observations_path.exists():
        raise SystemExit(f"Missing {observations_path}")
    if not args.skip_pressurepaths and not pressure_path.exists():
        raise SystemExit(f"Missing {pressure_path}")

    reset_output_dir(output_dir)

    records = load_datapackage_records(datapackage_csv_path)
    print("[process] loading datapackages.csv")
    projects, project_index, record_to_project = process_projects(records)

    print("[process] loading species.csv")
    species_lookup = load_species_lookup(species_path)

    project_map = {}
    project_title_map: Dict[str, str] = {}
    for project in projects:
        project_id = project.get("id")
        if project_id:
            project_map[project_id] = project
            project_title_map[project_id] = project.get("title") or ""

    print("[process] processing tags and observations")
    tags = process_tags(tags_path, project_index, record_to_project, species_lookup)
    tag_stats, tag_locations, tag_observations = process_observations(observations_path)

    for tag in tags:
        stats = tag_stats.get(tag.get("tag_id") or "", {})
        tag["sex"] = stats.get("sex")
        tag["age_class"] = stats.get("age_class")
        tag["wing_length"] = stats.get("wing_length")

    resources = load_resource_descriptors(datapackage_resource_path)
    # Filter to tags that have at least one stap row and at least one path row.
    staps_columns_all = [field.get("name") for field in resources["staps"].get("fields", []) if field.get("name")]
    staps_columns = [
        col for col in staps_columns_all if col not in {"tag_id", "known_lat", "known_lon"}
    ]
    staps_columns, staps_rows_by_tag = load_raw_table_by_tag(
        resources["staps"], allowed_columns=staps_columns
    )
    stap_tag_ids = {tag_id for tag_id, rows in staps_rows_by_tag.items() if rows}
    paths_columns = [
        "stap_id",
        "type",
        "lat",
        "lon",
    ]
    paths_columns, paths_rows_by_tag = load_raw_table_by_tag(
        resources["paths"],
        allowed_tags=stap_tag_ids,
        allowed_columns=paths_columns,
        max_simulation_j=10,
    )
    path_tag_ids = {tag_id for tag_id, rows in paths_rows_by_tag.items() if rows}
    valid_tag_ids = stap_tag_ids & path_tag_ids
    tags = [tag for tag in tags if tag.get("tag_id") in valid_tag_ids]
    tag_locations = {tag_id: tag_locations[tag_id] for tag_id in valid_tag_ids if tag_id in tag_locations}
    tag_observations = {
        tag_id: tag_observations[tag_id] for tag_id in valid_tag_ids if tag_id in tag_observations
    }

    tags_min = []
    for tag in tags:
        project_id = tag.get("project_id")
        tags_min.append(
            {
                "tag_id": tag.get("tag_id"),
                "common_name": tag.get("common_name"),
                "scientific_name": tag.get("scientific_name"),
                "project_id": project_id,
                "project_title": project_title_map.get(project_id) if project_id else None,
                "species_code": tag.get("species_code"),
                "birdlife_factsheet_url": tag.get("birdlife_factsheet_url"),
                "birds_of_the_world_url": tag.get("birds_of_the_world_url"),
            }
        )
    compact_dump(output_dir / "tags.json", tags_min)
    print("[process] wrote tags.json")

    for project in projects:
        taxonomic = project.get("taxonomic") or []
        if isinstance(taxonomic, list):
            project["taxonomic"] = build_taxa_objects([str(name) for name in taxonomic], species_lookup)

    tag_to_project = {
        tag.get("tag_id"): tag.get("project_id") for tag in tags if tag.get("tag_id")
    }
    project_location_sets: Dict[str, Dict[str, Any]] = defaultdict(
        lambda: {"names": set(), "coords": set(), "entries": []}
    )

    for tag_id, locations in tag_locations.items():
        project_id = tag_to_project.get(tag_id)
        if not project_id or project_id not in project_map:
            continue
        for loc_type in ("equipment", "retrieval"):
            for entry in locations.get(loc_type, []):
                name = (entry.get("location_name") or "").strip()
                coord_key = (entry.get("latitude"), entry.get("longitude"))
                bucket = project_location_sets[project_id]
                if name and name in bucket["names"]:
                    continue
                if coord_key in bucket["coords"]:
                    continue
                if name:
                    bucket["names"].add(name)
                bucket["coords"].add(coord_key)
                bucket["entries"].append(
                    {
                        "latitude": entry.get("latitude"),
                        "longitude": entry.get("longitude"),
                        "location_name": name,
                        "kind": loc_type,
                    }
                )

    project_known_locations = {
        project_id: locs["entries"] for project_id, locs in project_location_sets.items()
    }

    tag_meta_map = {
        tag.get("tag_id"): {
            "scientific_name": tag.get("scientific_name"),
            "common_name": tag.get("common_name"),
            "species_code": tag.get("species_code"),
            "birdlife_factsheet_url": tag.get("birdlife_factsheet_url"),
            "birds_of_the_world_url": tag.get("birds_of_the_world_url"),
            "in_ebirdst": tag.get("in_ebirdst"),
            "sex": tag.get("sex"),
            "age_class": tag.get("age_class"),
            "wing_length": tag.get("wing_length"),
        }
        for tag in tags
        if tag.get("tag_id")
    }

    print("[process] building per-project assets")
    project_ids_with_data = process_project_assets(
        output_dir,
        paths_path,
        staps_path,
        tag_to_project,
        tag_meta_map,
        project_known_locations,
    )
    print("[process] wrote project assets")

    for project in projects:
        project_id = project.get("id")
        project["has_project_data"] = bool(project_id in project_ids_with_data)

    compact_dump(output_dir / "projects.json", projects)
    print("[process] wrote projects.json")

    print("[process] building globe data")
    globe_tags = process_paths(
        paths_path,
        staps_path,
        tag_meta_map,
        tag_to_project,
        project_title_map,
    )
    compact_dump(output_dir / "globe.json", globe_tags)
    print("[process] wrote globe.json")

    edges_columns = [
        "stap_s",
        "stap_t",
        "type",
        "distance",
        "bearing",
        "gs_u",
        "gs_v",
        "ws_u",
        "ws_v",
    ]
    edges_columns, edges_rows_by_tag = load_raw_table_by_tag(
        resources["edges"],
        allowed_tags=valid_tag_ids,
        allowed_columns=edges_columns,
    )
    pressure_columns: List[str] = []
    pressure_rows_by_tag: Dict[str, Dict[str, List[Any]]] = {}
    if not args.skip_pressurepaths:
        pressure_columns_all = [
            field.get("name")
            for field in resources["pressurepaths"].get("fields", [])
            if field.get("name")
        ]
        pressure_columns = [
            col
            for col in pressure_columns_all
            if col not in {"tag_id", "ind", "location_name", "life_stage", "nb_sample"}
        ]
        pressure_columns, pressure_rows_by_tag = load_raw_table_by_tag(
            resources["pressurepaths"],
            allowed_tags=valid_tag_ids,
            allowed_columns=pressure_columns,
            max_simulation_j=10,
        )

    print("[process] building tag assets")
    process_tag_assets(
        output_dir,
        tags,
        tag_observations,
        paths_columns,
        paths_rows_by_tag,
        edges_columns,
        edges_rows_by_tag,
        staps_columns,
        staps_rows_by_tag,
        pressure_columns,
        pressure_rows_by_tag,
    )
    print("[process] wrote tag assets")

    if not args.skip_pressurepaths:
        print("[process] embedded raw pressurepaths in tag assets")
    else:
        print("[process] skipped pressurepaths")


if __name__ == "__main__":
    main()
