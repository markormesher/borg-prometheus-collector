function formatMeasurement(name: string, tags: { [key: string]: string }, value: number): string {
  let tagStr = "";
  for (const [tagKey, tagVal] of Object.entries(tags)) {
    if (tagStr.length > 0) {
      tagStr += ",";
    }
    tagStr += `${tagKey}=${tagVal}`;
  }
  if (tagStr.length > 0) {
    tagStr = `{${tagStr}}`;
  }

  return `${name}${tagStr} ${value} ${new Date().getTime()}`;
}

export { formatMeasurement };
