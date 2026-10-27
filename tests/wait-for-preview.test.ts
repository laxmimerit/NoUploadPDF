import { describe, expect, it, vi } from "vitest";
import waitForPreview from "../.github/scripts/wait-for-preview.cjs";

const headSha = "pr-head-commit";
const deployment = (overrides = {}) => ({
  id: 10,
  sha: headSha,
  creator: { login: "vercel[bot]" },
  environment: "Preview",
  production_environment: false,
  ...overrides,
});
const success = { state: "success", environment_url: "https://commit-preview.vercel.app" };

function harness() {
  return {
    github: {
      paginate: vi.fn().mockResolvedValue([deployment()]),
      rest: { repos: {
        listDeployments: vi.fn(),
        listDeploymentStatuses: vi.fn().mockResolvedValue({ data: [success] }),
      } },
    },
    context: {
      repo: { owner: "example", repo: "pdf" },
      sha: "synthetic-merge-commit",
      payload: { pull_request: { head: { sha: headSha } } },
    },
    core: { info: vi.fn(), setOutput: vi.fn() },
    attempts: 3,
    interval: 1,
    sleep: vi.fn().mockResolvedValue(undefined),
  };
}

describe("waiting for a PR's Vercel preview", () => {
  it("uses the head SHA and deployment environment URL, ignoring unrelated deployments", async () => {
    const args = harness();
    args.github.paginate.mockResolvedValue([
      deployment({ id: 14, sha: "synthetic-merge-commit" }),
      deployment({ id: 13, creator: { login: "other[bot]" } }),
      deployment({ id: 12, environment: "Production", production_environment: true }),
      deployment({ id: 11, environment: "Preview", production_environment: true }),
      deployment(),
    ]);
    await expect(waitForPreview(args)).resolves.toBe(`${success.environment_url}/`);
    expect(args.github.paginate).toHaveBeenCalledWith(args.github.rest.repos.listDeployments, {
      owner: "example", repo: "pdf", sha: headSha, per_page: 100,
    });
    expect(args.github.rest.repos.listDeploymentStatuses).toHaveBeenCalledExactlyOnceWith({
      owner: "example", repo: "pdf", deployment_id: 10, per_page: 100,
    });
    expect(args.core.setOutput).toHaveBeenCalledWith("url", `${success.environment_url}/`);
  });

  it("waits for the deployment to appear and finish, even if an older deployment succeeded", async () => {
    const args = harness();
    args.github.paginate.mockResolvedValueOnce([])
      .mockResolvedValue([deployment({ id: 9 }), deployment()]);
    args.github.rest.repos.listDeploymentStatuses
      .mockResolvedValueOnce({ data: [{ state: "in_progress" }, success] })
      .mockResolvedValueOnce({ data: [success] });
    await expect(waitForPreview(args)).resolves.toBe(`${success.environment_url}/`);
    expect(args.sleep).toHaveBeenCalledTimes(2);
    expect(args.github.rest.repos.listDeploymentStatuses.mock.calls.every(
      ([request]) => request.deployment_id === 10,
    )).toBe(true);
  });

  it.each(["failure", "error", "inactive"])("fails on current %s instead of using stale success", async (state) => {
    const args = harness();
    args.github.rest.repos.listDeploymentStatuses.mockResolvedValue({ data: [{ state }, success] });
    await expect(waitForPreview(args)).rejects.toThrow(`deployment 10: ${state}`);
    expect(args.core.setOutput).not.toHaveBeenCalled();
  });

  it.each([
    { data: [] },
    { data: [{ state: "success" }] },
    { data: [{ state: "queued" }] },
  ])("times out without a ready URL: %j", async ({ data }) => {
    const args = harness();
    args.github.rest.repos.listDeploymentStatuses.mockResolvedValue({ data });
    await expect(waitForPreview(args)).rejects.toThrow("Timed out waiting for Vercel preview for pr-head-commit");
    expect(args.sleep).toHaveBeenCalledTimes(2);
    expect(args.core.setOutput).not.toHaveBeenCalled();
  });

  it("times out if Vercel never creates a matching deployment", async () => {
    const args = harness();
    args.github.paginate.mockResolvedValue([]);
    await expect(waitForPreview(args)).rejects.toThrow("no matching deployment");
    expect(args.github.rest.repos.listDeploymentStatuses).not.toHaveBeenCalled();
  });

  it("rejects a non-HTTPS deployment URL", async () => {
    const args = harness();
    args.github.rest.repos.listDeploymentStatuses.mockResolvedValue({
      data: [{ ...success, environment_url: "http://preview.example.com" }],
    });
    await expect(waitForPreview(args)).rejects.toThrow("must use HTTPS");
    expect(args.core.setOutput).not.toHaveBeenCalled();
  });
});
