# Borg Prometheus Collector

A simple Prometheus collector to provide measurements about a single [Borg backup](https://borgbackup.readthedocs.io/en/stable) repository. The collector will produce metrics about the entire repository and individual archives (see below).

:rocket: Jump to [quick-start example](#quick-start-docker-compose-example).

:whale: See releases on [Docker Hub](https://hub.docker.com/repository/docker/markormesher/borg-prometheus-collector/tags).

## Archives and Archive Prefixes

First, some terms:

- An **archive** - the result of a single backup (i.e. the result of `borg create`).
- A **repository** - an on-disk store of many archives.
- See more: [Borg docs](https://borgbackup.readthedocs.io/en/stable/quickstart.html#archives-and-repositories)

This collector assumes that your archives are named consistently and can be grouped by a common part of those names, which we call the **archive label**. For example, if you're backing up multiple machines to one repository, you might name your archives in the format `$hostname-$timestamp`. In this case, the hostname would be your archive label. You can specify which part of the repository name is the label by specifying a regex - see [configuration](#configuration) below.

## Measurements

| Measurement | Description | Labels
| --- | --- | --- |
| `borg_repo_size_bytes` | Total size of the backup repository on disk, in bytes. | `repo_path` |
| `borg_archive_age_seconds` | Age of the most recent backup for each archive label at the point the measurements were taken, in seconds. | `repo_path` and `archive_label` |
| `borg_archive_original_size_bytes` | Original size of the most recent backup for each archive label, in bytes. | `repo_path` and `archive_label` |
| `borg_archive_compressed_size_bytes` | Compressed size of the most recent backup for each archive label, in bytes. | `repo_path` and `archive_label` |
| `borg_archive_number_of_files` | Number of files in the most recent backup for each archive label. | `repo_path` and `archive_label` |

## Configuration

Configuration is via the following environment variables:

| Variable | Required? | Description | Default
| --- | --- | --- | --- |
| `REPO_PATH` | yes | Path to where your repo is mounted in the Docker container. It is recommended to make this path mirror the actual path on disk - see the quick-start example below. | n/a |
| `REPO_PASSPHRASE` | no | Passphrase to your repo, if there is one. | none |
| `REPO_PASSPHRASE_FILE` | no | Same as above, but read from a file. | none |
| `ARCHIVE_LABEL_REGEX` | no | Regex that defines how to extract the archive label from your archive names. The default will take everything before the first hyphen. Make sure the label segment is wrapped in `(...)` so it can be extracted as a group. | `(.*?)-.+` |
| `ARCHIVE_LABEL_GROUP` | no | Position of the group in the regex that contains the group label (positions start at 1). | `1` |

## Docker Details

Two paths need to be mounted into your Docker container:

- The base path of your Borg repository, which can be mounted as read-only. Because Borg uses the repo path to lookup configuration about the repo, it is strongly recommended to make the mount path in the container the same as the repo's actual path on disk (see the Docker Compose example below).
- Your Borg configuration folder, which is `${HOME}/.config/borg` if you're on Linux. The container runs as the unpriviledged `node` user, so this must be mounted at `/home/node/.config/borg` (again, see the Docker Compose example below).

You should set the user and group ID in the container to match those as the user who owns the Borg repository on the host system. You can find these by running `id -u` and `id -g`.

## Quick-Start Docker-Compose Example

```yaml
version: "3.8"

services:
  borg-prometheus-collector:
    build: markormesher/borg-prometheus-collector
    restart: unless-stopped
    user: 1000:1000 # user and group from $(id -u) and $(id -g)
    environment:
      - REPO_PATH=/hdd/borg/my-repo
      - REPO_PASSPHRASE_FILE=/run/secrets/borg-repo-passphrase
      - ARCHIVE_LABEL_REGEX=(.*)-20.*
      - ARCHIVE_LABEL_GROUP=1
    secrets:
      - borg-repo-passphrase
    volumes:
      - /hdd/borg/my-repo:/hdd/borg/my-repo:ro
      - ${HOME}/.config/borg:/home/node/.config/borg # note the node user here!
    ports:
      - 9030:9030

secrets:
  borg-repo-passphrase:
    file: ./secrets/borg-repo-passphrase.txt
```
