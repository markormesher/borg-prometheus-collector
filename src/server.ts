import * as http from "http";
import * as util from "util";
import { exec as execRaw } from "child_process";
import { ConfigKey, getConfig } from "./config";
import { formatMeasurement } from "./utils";

const exec = util.promisify(execRaw);

// get config
const repoPath = getConfig(ConfigKey.RepoPath);
const repoPassphrase = getConfig(ConfigKey.RepoPassphrase);
const archiveLabelRegex = new RegExp(getConfig(ConfigKey.ArchiveLabelRegex, "(.*?)-.+"));
const archiveLabelRegexGroup = parseInt(getConfig(ConfigKey.ArchiveLabelRegexGroup, "1"));

// setup env
process.env["BORG_RELOCATED_REPO_ACCESS_IS_OK"] = "yes";
process.env["BORG_PASSPHRASE"] = repoPassphrase;

async function getMeasurements(): Promise<string[]> {
  const measurements: string[] = [];

  // overall repo size
  const repoSizeCmd = await exec(`du --max-depth 0 -B1 "${repoPath}"`);
  const repoSizeBytes = parseInt(repoSizeCmd.stdout.split(" ")[0]);
  measurements.push(formatMeasurement("borg_repo_size_bytes", { repo_path: repoPath }, repoSizeBytes));

  // archive ages
  const archiveListCmd = await exec(`borg --bypass-lock list ${repoPath}`);
  const archiveLabeles: Set<string> = new Set();
  const now = new Date().getTime();
  const minAges: { [key: string]: number } = {};
  for (const line of archiveListCmd.stdout.trim().split("\n")) {
    const label = line.split(" ")[0].match(archiveLabelRegex)[archiveLabelRegexGroup];
    archiveLabeles.add(label);
    const dateStr = line.replace(/^[a-zA-Z0-9-]+ +(.*) \[[a-f0-9]+\]/, "$1");
    const date = new Date(dateStr);
    const ageMs = Math.floor((now - date.getTime()) / 1000);
    minAges[label] = Math.min(ageMs, minAges[label] || Number.MAX_SAFE_INTEGER);
  }

  for (const [archiveLabel, age] of Object.entries(minAges)) {
    measurements.push(
      formatMeasurement("borg_archive_age_seconds", { repo_path: repoPath, archive_label: archiveLabel }, age),
    );
  }

  // archive sizes
  for (const archiveLabel of archiveLabeles) {
    const archiveInfoCmd = await exec(
      `borg --bypass-lock info ${repoPath} --prefix ${archiveLabel} --sort-by timestamp --last 1 --json`,
    );
    const archiveInfo = JSON.parse(archiveInfoCmd.stdout).archives[0];
    measurements.push(
      formatMeasurement(
        "borg_archive_original_size_bytes",
        { repo_path: repoPath, archive_label: archiveLabel },
        archiveInfo.stats.original_size,
      ),
    );
    measurements.push(
      formatMeasurement(
        "borg_archive_compressed_size_bytes",
        { repo_path: repoPath, archive_label: archiveLabel },
        archiveInfo.stats.compressed_size,
      ),
    );
    measurements.push(
      formatMeasurement(
        "borg_archive_number_of_files",
        { repo_path: repoPath, archive_label: archiveLabel },
        archiveInfo.stats.nfiles,
      ),
    );
  }

  return measurements;
}

const server = http.createServer(async (req, res) => {
  if (req.url !== "/metrics") {
    res.writeHead(404).end();
    return;
  }

  try {
    const measurements = await getMeasurements();
    res
      .writeHead(200, {
        "Content-Type": "text/plain",
      })
      .end(measurements.join("\n"));
  } catch (err) {
    console.log("Failed to get measurements", err);
    res.writeHead(500).end();
  }
});

server.listen(3000, () => console.log("Server listening on HTTP/3000"));

process.on("SIGTERM", () => {
  console.log("Closing server connection");
  server.close(() => {
    console.log("Exiting process");
    process.exit(0);
  });
});
