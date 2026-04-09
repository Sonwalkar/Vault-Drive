enum STATUS_CODES {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

const SUPABASE_TABLES = {
  PROFILES: "profiles",
  FILES: "files",
  ACTIVITY_LOG: "activity_log",
  FOLDERS: "folders",
  FILE_SHARES: "file_shares",
};

const S3_BUCKET_NAME = `vaultdrive-${process.env?.STAGE}-bucket`;

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  // PRODUCTION = "https://vaultdrive.com",
];

export { STATUS_CODES, SUPABASE_TABLES, S3_BUCKET_NAME, ALLOWED_ORIGINS };
