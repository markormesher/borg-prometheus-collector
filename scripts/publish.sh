#! /usr/bin/env bash
set -ueo pipefail

if [ -n "$(git status --porcelain)" ]; then
  echo "Not in a clean working tree"
  exit 1
fi

tag=$(git describe --tags)

if [ -z "${tag}" ]; then
  echo "Not on a tagged commit"
  exit 1
fi

docker build . -t "markormesher/borg-prometheus-collector:${tag}"
docker push "markormesher/borg-prometheus-collector:${tag}"
