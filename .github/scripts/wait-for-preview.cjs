// GitHub's deployment status supplies the public preview URL; no Vercel token is needed.
module.exports = async function waitForPreview({
  github, context, core,
  attempts = 80,
  interval = 15_000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const sha = context.payload.pull_request.head.sha;
  const repo = context.repo;
  let lastState = "no matching deployment";

  for (let attempt = 0; attempt < attempts; attempt++) {
    const deployments = await github.paginate(github.rest.repos.listDeployments, {
      ...repo, sha, per_page: 100,
    });
    // A PR run's GITHUB_SHA is the synthetic merge commit. Vercel deploys the head SHA.
    const deployment = deployments
      .filter((item) => item.sha === sha && item.creator?.login === "vercel[bot]"
        && /^preview$/i.test(item.environment) && !item.production_environment)
      .sort((a, b) => b.id - a.id)[0];

    if (deployment) {
      const { data: statuses } = await github.rest.repos.listDeploymentStatuses({
        ...repo, deployment_id: deployment.id, per_page: 100,
      });
      // Only the current status counts; an earlier success may since have been deactivated.
      const status = statuses[0];
      lastState = `deployment ${deployment.id}: ${status?.state ?? "awaiting status"}`;
      if (status?.state === "success" && status.environment_url) {
        const url = new URL(status.environment_url);
        if (url.protocol !== "https:") throw new Error("The preview URL must use HTTPS.");
        core.info(`Vercel preview for ${sha}: ${url.href}`);
        core.setOutput("url", url.href);
        return url.href;
      }
      if (["failure", "error", "inactive"].includes(status?.state)) {
        throw new Error(`Vercel preview for ${sha} is unavailable (${lastState}).`);
      }
    }
    core.info(`Waiting for Vercel preview for ${sha} (${lastState}).`);
    if (attempt + 1 < attempts) await sleep(interval);
  }
  throw new Error(`Timed out waiting for Vercel preview for ${sha} (${lastState}).`);
};
