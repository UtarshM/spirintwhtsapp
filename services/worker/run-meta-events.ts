import { processMetaEvents } from "./meta-events";
processMetaEvents()
  .then((summary) => {
    console.log(JSON.stringify(summary));
    if (summary.failed) process.exitCode = 1;
  })
  .catch(() => {
    console.error(
      "Meta event worker failed. Check database configuration and migrations.",
    );
    process.exitCode = 1;
  });
