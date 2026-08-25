import re


PROTOCOL_VERSION = 1
IDENTIFIER_MAX_LENGTH = 64
MAX_REQUEST_BYTES = 1024 * 1024
JSON_ENCODING = "utf-8"
TARGET_NEW_DOCUMENT = "new_document"
TARGET_ACTIVE_DOCUMENT = "active_document"
ALLOWED_TARGETS = frozenset(
    {
        TARGET_NEW_DOCUMENT,
        TARGET_ACTIVE_DOCUMENT,
    }
)
IDENTIFIER_PATTERN = re.compile(
    rf"^[A-Za-z0-9][A-Za-z0-9_-]{{0,{IDENTIFIER_MAX_LENGTH - 1}}}$"
)
REQUEST_FIELDS = frozenset(
    {
        "version",
        "request_id",
        "job",
        "target",
        "parameters",
    }
)
