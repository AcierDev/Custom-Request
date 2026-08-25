import { STEP_EXPORT_CONFIG } from "./stepConfig.ts";

export interface StepExportMetadata {
  description: string;
  exportedAtIso: string;
  filename: string;
  filenameStamp: string;
}

const UTF8_ENCODING = "utf8";
const HEADER_SECTION_PATTERN = /(HEADER;\s*)([\s\S]*?)(\s*ENDSEC;)/;
const FILE_DESCRIPTION_PATTERN =
  /FILE_DESCRIPTION\s*\([\s\S]*?\)\s*;/;
const FILE_NAME_PATTERN =
  /FILE_NAME\s*\([\s\S]*?\)\s*;(?=\s*FILE_SCHEMA)/;
const STEP_STRING_DELIMITER_PATTERN = /'/g;
const STEP_ESCAPED_STRING_DELIMITER = "''";

const padDateComponent = (value: number, width: number): string =>
  String(value).padStart(width, "0");

const escapeStepString = (value: string): string =>
  value.replace(
    STEP_STRING_DELIMITER_PATTERN,
    STEP_ESCAPED_STRING_DELIMITER,
  );

export function createStepExportMetadata(
  exportedAt: Date,
): StepExportMetadata {
  if (Number.isNaN(exportedAt.getTime())) {
    throw new Error(STEP_EXPORT_CONFIG.defaultErrorMessage);
  }

  const separator = STEP_EXPORT_CONFIG.filenameDateSeparator;
  const dateStamp = [
    padDateComponent(
      exportedAt.getMonth() + STEP_EXPORT_CONFIG.firstComponentNumber,
      STEP_EXPORT_CONFIG.dateComponentWidth,
    ),
    padDateComponent(
      exportedAt.getDate(),
      STEP_EXPORT_CONFIG.dateComponentWidth,
    ),
    padDateComponent(
      exportedAt.getFullYear() % STEP_EXPORT_CONFIG.shortYearModulo,
      STEP_EXPORT_CONFIG.yearComponentWidth,
    ),
  ].join(separator);
  const filenameStamp = dateStamp;

  return {
    description: STEP_EXPORT_CONFIG.description,
    exportedAtIso: exportedAt.toISOString(),
    filename: `${STEP_EXPORT_CONFIG.filenamePrefix}${STEP_EXPORT_CONFIG.filenamePrefixSeparator}${filenameStamp}${STEP_EXPORT_CONFIG.fileExtension}`,
    filenameStamp,
  };
}

export function applyStepHeaderMetadata(
  bytes: Uint8Array,
  metadata: StepExportMetadata,
): Uint8Array {
  const source = new TextDecoder(UTF8_ENCODING).decode(bytes);
  const headerMatch = source.match(HEADER_SECTION_PATTERN);
  if (!headerMatch) {
    throw new Error("STEP export is missing writable metadata records.");
  }

  const headerBody = headerMatch[2];
  if (
    !FILE_DESCRIPTION_PATTERN.test(headerBody) ||
    !FILE_NAME_PATTERN.test(headerBody)
  ) {
    throw new Error("STEP export is missing writable metadata records.");
  }

  const descriptionRecord = `FILE_DESCRIPTION(('${escapeStepString(
    metadata.description,
  )}'),'${STEP_EXPORT_CONFIG.stepHeaderImplementationLevel}');`;
  const filenameRecord = `FILE_NAME('${escapeStepString(
    metadata.filename,
  )}','${escapeStepString(metadata.exportedAtIso)}',('${escapeStepString(
    STEP_EXPORT_CONFIG.stepHeaderAuthor,
  )}'),('${escapeStepString(
    STEP_EXPORT_CONFIG.stepHeaderOrganization,
  )}'),'${escapeStepString(
    STEP_EXPORT_CONFIG.stepHeaderPreprocessorVersion,
  )}','${escapeStepString(
    STEP_EXPORT_CONFIG.stepHeaderOriginatingSystem,
  )}','${escapeStepString(
    STEP_EXPORT_CONFIG.stepHeaderAuthorization,
  )}');`;
  const rewrittenHeader = headerBody
    .replace(FILE_DESCRIPTION_PATTERN, descriptionRecord)
    .replace(FILE_NAME_PATTERN, filenameRecord);
  const rewritten = source.replace(
    HEADER_SECTION_PATTERN,
    `${headerMatch[1]}${rewrittenHeader}${headerMatch[3]}`,
  );

  return new TextEncoder().encode(rewritten);
}
